#!/usr/bin/env python3
"""
FS25 G-Portal savegame sync  ->  games/fs25/data/*.json

Runs from .github/workflows/fs25-sync.yml every 16 minutes.

Smart mode:
  * FULL  pull - someone is on the server (or first run / forced): every *.xml in
                 the savegame folder is converted to JSON.
  * LIGHT pull - nobody is on: only the date/time, field growth, lime and
                 fertilizer files are checked (careerSavegame, environment,
                 fields, farmland).
  In both modes a file is only downloaded when its modified time on the server
  changed, and the output is only rewritten when the data actually changed, so
  an idle server produces no commits.

Environment (GitHub secrets / vars):
  FTP_HOST, FTP_PORT, FTP_USER, FTP_PASS   required
  FS25_SAVE_DIR    optional  e.g. /profile/savegame1  (auto-discovered if empty)
  FS25_STATS_URL   optional  the server's "dedicated-server-stats.xml?code=..." link
                             (most accurate way to see who is online)
  FORCE_MODE       optional  auto | full | light   (default auto)
"""

import ftplib
import io
import json
import os
import re
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "games", "fs25", "data")
RAW_DIR = os.path.join(OUT_DIR, "raw")
STATE_FILE = os.path.join(OUT_DIR, "state.json")
OVERVIEW_FILE = os.path.join(OUT_DIR, "overview.json")
HISTORY_FILE = os.path.join(OUT_DIR, "history.json")

LIGHT_FILES = ["careerSavegame.xml", "environment.xml", "fields.xml", "farmland.xml"]
MAX_XML_BYTES = 40 * 1024 * 1024
LOG_TAIL_BYTES = 256 * 1024
PERIODS = ["EARLY_SPRING", "MID_SPRING", "LATE_SPRING", "EARLY_SUMMER", "MID_SUMMER", "LATE_SUMMER",
           "EARLY_AUTUMN", "MID_AUTUMN", "LATE_AUTUMN", "EARLY_WINTER", "MID_WINTER", "LATE_WINTER"]
MONTHS = ["March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December", "January", "February"]


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def log(*a):
    print(*a, flush=True)


# --------------------------------------------------------------------------- XML -> JSON
def coerce(v):
    if v is None:
        return None
    s = v.strip()
    if s in ("true", "false"):
        return s == "true"
    if re.fullmatch(r"-?\d+", s) and len(s) < 16:
        return int(s)
    if re.fullmatch(r"-?\d*\.\d+(e-?\d+)?", s, re.I):
        try:
            return float(s)
        except ValueError:
            pass
    return s


def element_to_obj(el):
    obj = {k: coerce(v) for k, v in el.attrib.items()}
    children = list(el)
    text = (el.text or "").strip()
    if not children and not obj:
        return coerce(text) if text else None
    if text:
        obj["#text"] = coerce(text)
    groups = {}
    for c in children:
        groups.setdefault(c.tag, []).append(element_to_obj(c))
    for tag, items in groups.items():
        key = tag if tag not in obj else f"{tag}_"
        obj[key] = items if len(items) > 1 else items[0]
    return obj


def xml_bytes_to_json(data):
    root = ET.fromstring(data)
    return {root.tag: element_to_obj(root)}


def as_list(x):
    if x is None:
        return []
    return x if isinstance(x, list) else [x]


def g(d, *path, default=None):
    for p in path:
        if not isinstance(d, dict) or p not in d:
            return default
        d = d[p]
    return d


def num(x, default=0):
    try:
        return float(x)
    except (TypeError, ValueError):
        return default


# --------------------------------------------------------------------------- FTP
def connect():
    host = os.environ.get("FTP_HOST", "").strip()
    port = int(os.environ.get("FTP_PORT", "21").strip() or 21)
    user = os.environ.get("FTP_USER", "").strip()
    pw = os.environ.get("FTP_PASS", "")
    if not host or not user:
        sys.exit("FTP_HOST / FTP_USER secrets are missing.")
    host = re.sub(r"^ftps?://", "", host).split("/")[0]
    if ":" in host:
        host, p = host.rsplit(":", 1)
        port = int(p) if p.isdigit() else port
    last = None
    for cls in (ftplib.FTP, ftplib.FTP_TLS):
        try:
            ftp = cls(timeout=45)
            ftp.connect(host, port)
            ftp.login(user, pw)
            if isinstance(ftp, ftplib.FTP_TLS):
                ftp.prot_p()
            ftp.set_pasv(True)
            ftp.encoding = "utf-8"
            log(f"Connected to {host}:{port} via {cls.__name__}")
            return ftp
        except Exception as e:  # try TLS next
            last = e
            log(f"{cls.__name__} failed: {e}")
    sys.exit(f"Could not log in to FTP: {last}")


def parse_mdtm(s):
    s = re.sub(r"\.\d+$", "", s.strip())
    try:
        return datetime.strptime(s, "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc).timestamp()
    except ValueError:
        return None


def list_dir(ftp, path):
    """Return {name: {"type": "file"|"dir", "size": int, "mtime": epoch|None}}."""
    out = {}
    try:
        for name, facts in ftp.mlsd(path, facts=["type", "size", "modify"]):
            if name in (".", ".."):
                continue
            t = facts.get("type", "file")
            out[name] = {
                "type": "dir" if t in ("dir", "cdir", "pdir") else "file",
                "size": int(facts.get("size", 0) or 0),
                "mtime": parse_mdtm(facts["modify"]) if facts.get("modify") else None,
            }
        return out
    except ftplib.all_errors:
        pass
    # Fallback: NLST + SIZE/MDTM probes
    try:
        names = ftp.nlst(path)
    except ftplib.all_errors:
        return out
    for full in names:
        name = full.rstrip("/").split("/")[-1]
        if name in (".", ".."):
            continue
        p = f"{path.rstrip('/')}/{name}"
        info = {"type": "dir", "size": 0, "mtime": None}
        try:
            info["size"] = ftp.size(p) or 0
            info["type"] = "file"
            resp = ftp.sendcmd(f"MDTM {p}")
            info["mtime"] = parse_mdtm(resp.split()[-1])
        except ftplib.all_errors:
            pass
        out[name] = info
    return out


def download(ftp, path, offset=0):
    buf = io.BytesIO()
    ftp.retrbinary(f"RETR {path}", buf.write, rest=offset or None)
    return buf.getvalue()


def find_save_dir(ftp, state):
    forced = os.environ.get("FS25_SAVE_DIR", "").strip()
    if forced:
        return forced.rstrip("/") or "/"
    cached = state.get("saveDir")
    if cached and "careerSavegame.xml" in list_dir(ftp, cached):
        return cached
    log("Searching the FTP for the savegame folder ...")
    start = ftp.pwd() or "/"
    queue, seen, found = [(start, 0)], set(), []
    skip = re.compile(r"^(mods|cache|shader_cache|screenshots|music|pdlc|dlc|logs?)$", re.I)
    while queue and len(seen) < 120:
        path, depth = queue.pop(0)
        if path in seen:
            continue
        seen.add(path)
        entries = list_dir(ftp, path)
        if "careerSavegame.xml" in entries:
            found.append((entries["careerSavegame.xml"].get("mtime") or 0, path))
        if depth >= 4:
            continue
        for name, info in sorted(entries.items()):
            if info["type"] == "dir" and not skip.match(name):
                queue.append((f"{path.rstrip('/')}/{name}", depth + 1))
    if not found:
        sys.exit("No careerSavegame.xml found on the FTP. Set the FS25_SAVE_DIR variable "
                 "(for example /profile/savegame1).")
    found.sort(reverse=True)
    log(f"Savegame folder: {found[0][1]}")
    return found[0][1]


# --------------------------------------------------------------------------- player detection
def players_from_stats_url():
    url = os.environ.get("FS25_STATS_URL", "").strip()
    if not url:
        return None
    try:
        with urllib.request.urlopen(url, timeout=20) as r:
            root = ET.fromstring(r.read())
    except Exception as e:
        log(f"Stats feed unreachable: {e}")
        return {"source": "stats", "reachable": False, "online": False, "names": [], "count": 0}
    slots = root.find("Slots")
    names = []
    if slots is not None:
        for p in slots.findall("Player"):
            if p.get("isUsed") == "true":
                names.append({
                    "name": (p.text or "").strip(),
                    "isAdmin": p.get("isAdmin") == "true",
                    "uptimeMin": int(num(p.get("uptime"))),
                })
    count = int(num(slots.get("numUsed"))) if slots is not None else len(names)
    return {
        "source": "stats",
        "reachable": True,
        "online": True,
        "serverName": root.get("name"),
        "mapName": root.get("mapName"),
        "version": root.get("version"),
        "capacity": int(num(slots.get("capacity"))) if slots is not None else None,
        "count": count,
        "names": names,
    }


_NAME = r"['\"]?(?P<name>[^'\"\s][^'\"]{0,38}?)['\"]?"
JOIN_RES = [re.compile(r"\b(?:player|user|client)\s+" + _NAME + r"\s+(?:has\s+)?(?:joined|connected)", re.I),
            re.compile(r"['\"](?P<name>[^'\"]{1,40})['\"]\s+(?:has\s+)?(?:joined|connected)", re.I)]
LEAVE_RES = [re.compile(r"\b(?:player|user|client)\s+" + _NAME + r"\s+(?:has\s+)?(?:left|disconnected|quit|timed out|was kicked)", re.I),
             re.compile(r"['\"](?P<name>[^'\"]{1,40})['\"]\s+(?:has\s+)?(?:left|disconnected|quit|timed out|was kicked)", re.I)]


def _match(res, line):
    for r in res:
        m = r.search(line)
        if m:
            return m.group("name").strip()
    return None


def players_from_log(ftp, save_dir):
    """Best-effort: read the tail of the server log and replay join/leave lines."""
    parent = save_dir.rstrip("/").rsplit("/", 1)[0] or "/"
    candidates = []
    for d in {parent, f"{parent}/dedicated_server/logs", f"{parent}/logs"}:
        for name, info in list_dir(ftp, d).items():
            if info["type"] == "file" and re.search(r"(log\.txt|server.*\.log|\.log)$", name, re.I):
                candidates.append((info.get("mtime") or 0, f"{d.rstrip('/')}/{name}", info["size"]))
    if not candidates:
        return None
    mtime, path, size = sorted(candidates, reverse=True)[0]
    try:
        data = download(ftp, path, max(0, size - LOG_TAIL_BYTES)).decode("utf-8", "replace")
    except ftplib.all_errors as e:
        log(f"Could not read log {path}: {e}")
        return None
    online = {}
    for line in data.splitlines():
        low = line.lower()
        if "dedicated server" in low and ("started" in low or "stopping" in low):
            online.clear()
        nm = _match(LEAVE_RES, line)
        if nm:
            online.pop(nm.lower(), None)
            continue
        nm = _match(JOIN_RES, line)
        if nm and len(nm) > 1:
            online[nm.lower()] = nm
    age_min = (time.time() - mtime) / 60 if mtime else None
    if age_min is not None and age_min > 180:
        online.clear()  # log not written for 3h+: server restarted/crashed, joins are stale
    return {
        "source": "log",
        "file": path.rsplit("/", 1)[-1],
        "logAgeMin": round(age_min, 1) if age_min is not None else None,
        "names": [{"name": n} for n in online.values()],
        "count": len(online),
    }


# --------------------------------------------------------------------------- overview
def load_raw(stem):
    p = os.path.join(RAW_DIR, f"{stem}.json")
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    return None


def fmt_daytime(v):
    if v is None:
        return None
    m = num(v)
    if m > 1440 * 2:  # stored in ms
        m = m / 60000.0
    m = m % 1440
    return f"{int(m // 60):02d}:{int(m % 60):02d}"


def build_career(cs):
    s = g(cs, "careerSavegame", "settings", default={}) or {}
    st = g(cs, "careerSavegame", "statistics", default={}) or {}
    settings = {k: v for k, v in s.items() if not isinstance(v, (dict, list))}
    return {
        "savegameName": s.get("savegameName"),
        "mapTitle": s.get("mapTitle"),
        "mapId": s.get("mapId"),
        "saveDate": s.get("saveDateFormatted") or s.get("saveDate"),
        "creationDate": s.get("creationDate"),
        "economicDifficulty": s.get("economicDifficulty"),
        "timeScale": s.get("timeScale"),
        "autoSaveInterval": s.get("autoSaveInterval"),
        "money": st.get("money"),
        "playTimeHours": round(num(st.get("playTime")) / 60, 1) if st.get("playTime") is not None else None,
        "slotUsage": g(cs, "careerSavegame", "slotSystem", "slotUsage"),
        "settings": settings,
    }


def build_environment(env):
    e = g(env, "environment", default={}) or {}
    day = int(num(e.get("currentDay"), 1)) or 1
    dpp = int(num(e.get("daysPerPeriod"), 1)) or 1
    period = ((day - 1) // dpp) % 12
    year = (day - 1) // (dpp * 12) + 1
    forecast = []
    for inst in as_list(g(e, "weather", "forecast", "instance"))[:10]:
        if isinstance(inst, dict):
            forecast.append({
                "type": inst.get("typeName"),
                "season": inst.get("seasonName"),
                "startDay": inst.get("startDay"),
                "startTime": fmt_daytime(inst.get("startDayTime")),
                "durationH": round(num(inst.get("duration")) / 3600000, 1) if inst.get("duration") else None,
            })
    return {
        "day": day,
        "monotonicDay": e.get("currentMonotonicDay"),
        "daysPerPeriod": dpp,
        "dayInPeriod": (day - 1) % dpp + 1,
        "period": PERIODS[period],
        "month": MONTHS[period],
        "season": PERIODS[period].split("_")[1].title(),
        "year": year,
        "time": fmt_daytime(e.get("dayTime")),
        "forecast": forecast,
    }


def build_farmlands(fl):
    out = []
    for f in as_list(g(fl, "farmlands", "farmland")):
        if isinstance(f, dict):
            out.append({"id": f.get("id"), "farmId": f.get("farmId", 0)})
    return out


def build_fields(fd, farmlands, career):
    owner = {f["id"]: f["farmId"] for f in farmlands}
    settings = (career or {}).get("settings", {})
    lime_on = settings.get("limeRequired", True) is not False
    plow_on = settings.get("plowingRequiredEnabled", True) is not False
    weeds_on = settings.get("weedsEnabled", True) is not False
    stones_on = settings.get("stonesEnabled", True) is not False
    out = []
    for f in as_list(g(fd, "fields", "field")):
        if not isinstance(f, dict):
            continue
        fid = f.get("id")
        fruit = f.get("fruitType") or "UNKNOWN"
        growth = int(num(f.get("growthState")))
        lime = int(num(f.get("limeLevel")))
        spray = int(num(f.get("sprayLevel")))
        plow = int(num(f.get("plowLevel")))
        weeds = int(num(f.get("weedState")))
        stones = int(num(f.get("stoneLevel")))
        farm = owner.get(fid, f.get("farmId", 0)) or 0
        needs = []
        if lime_on and lime == 0:
            needs.append("lime")
        if spray < 2:
            needs.append("fertilizer")
        if plow_on and plow == 0:
            needs.append("plow")
        if weeds_on and weeds > 0:
            needs.append("weeds")
        if stones_on and stones > 0:
            needs.append("stones")
        out.append({
            "id": fid,
            "farmId": farm,
            "isOwned": farm not in (0, None),
            "fruit": fruit,
            "plannedFruit": f.get("plannedFruit"),
            "growthState": growth,
            "lastGrowthState": f.get("lastGrowthState"),
            "groundType": f.get("groundType"),
            "sprayType": f.get("sprayType"),
            "sprayLevel": spray,
            "limeLevel": lime,
            "plowLevel": plow,
            "rollerLevel": f.get("rollerLevel"),
            "stubbleShredLevel": f.get("stubbleShredLevel"),
            "weedState": weeds,
            "stoneLevel": stones,
            "waterLevel": f.get("waterLevel"),
            "needs": needs,
            "grew": growth != int(num(f.get("lastGrowthState"), growth)),
        })
    out.sort(key=lambda x: num(x["id"]))
    return out


def build_farms(fm, players_raw):
    nick = {}
    for p in as_list(g(players_raw, "players", "player")):
        if isinstance(p, dict) and p.get("uniqueUserId"):
            nick[p["uniqueUserId"]] = p.get("lastNickname") or p.get("nickname")
    out = []
    for f in as_list(g(fm, "farms", "farm")):
        if not isinstance(f, dict):
            continue
        members = []
        for p in as_list(g(f, "players", "player")):
            if isinstance(p, dict):
                uid = p.get("uniqueUserId")
                members.append({
                    "name": p.get("lastNickname") or nick.get(uid) or "Player",
                    "farmManager": bool(p.get("farmManager")),
                })
        stats = g(f, "statistics", default={}) or {}
        out.append({
            "id": f.get("farmId"),
            "name": f.get("name"),
            "color": f.get("color"),
            "money": f.get("money"),
            "loan": f.get("loan"),
            "players": members,
            "stats": {k: v for k, v in stats.items() if not isinstance(v, (dict, list))},
        })
    return out


FUEL_TYPES = {"DIESEL", "ELECTRICCHARGE", "METHANE"}
AUX_TYPES = {"DEF", "AIR"}


def base_name(filename):
    if not filename:
        return "Unknown"
    stem = str(filename).replace("\\", "/").split("/")[-1].rsplit(".", 1)[0]
    return re.sub(r"(?<=[a-z])(?=[A-Z])", " ", stem).replace("_", " ").strip().title()


def brand_of(filename):
    parts = str(filename or "").replace("\\", "/").split("/")
    if "vehicles" in parts:
        i = parts.index("vehicles")
        if i + 1 < len(parts) - 1:
            return parts[i + 1].upper()
    if parts and parts[0].startswith("$moddir$"):
        return parts[0].replace("$moddir$", "").split("/")[0][:30]
    return None


def build_vehicles(vh):
    out = []
    for v in as_list(g(vh, "vehicles", "vehicle")):
        if not isinstance(v, dict):
            continue
        fn = v.get("filename") or ""
        low = fn.lower()
        kind = "pallet" if any(k in low for k in ("pallet", "bigbag", "boxpallet")) else "vehicle"
        wear = g(v, "wearable", default={}) or {}
        nodes = [num(n.get("amount")) for n in as_list(wear.get("wearNode")) if isinstance(n, dict)]
        fills, fuel = [], None
        for u in as_list(g(v, "fillUnit", "unit")):
            if not isinstance(u, dict):
                continue
            ft, lvl = u.get("fillType"), num(u.get("fillLevel"))
            if not ft or ft == "UNKNOWN":
                continue
            if ft in FUEL_TYPES:
                fuel = {"type": ft, "level": round(lvl, 1)}
            elif ft not in AUX_TYPES and lvl > 0.01:
                fills.append({"type": ft, "level": round(lvl, 1)})
        comp = g(v, "component", default=None)
        comp = as_list(comp)[0] if comp else {}
        pos = comp.get("position") if isinstance(comp, dict) else None
        out.append({
            "id": v.get("uniqueId") or v.get("id"),
            "name": base_name(fn),
            "brand": brand_of(fn),
            "filename": fn,
            "kind": kind,
            "farmId": v.get("farmId", 0),
            "age": v.get("age"),
            "price": v.get("price"),
            "propertyState": v.get("propertyState"),
            "operatingHours": round(num(v.get("operatingTime")) / 3600, 1),
            "damage": round(num(wear.get("damage")) * 100, 1),
            "wear": round(sum(nodes) / len(nodes) * 100, 1) if nodes else None,
            "fuel": fuel,
            "fills": fills,
            "position": pos,
            "isMod": low.startswith("$moddir$") or "/mods/" in low,
        })
    return out


def build_placeables(pl):
    out = []
    for p in as_list(g(pl, "placeables", "placeable")):
        if not isinstance(p, dict):
            continue
        prods = []
        pp = p.get("productionPoint") if isinstance(p.get("productionPoint"), dict) else None
        if pp:
            for pr in as_list(pp.get("production")):
                if isinstance(pr, dict):
                    prods.append({"id": pr.get("id"), "enabled": pr.get("isEnabled", True)})
        storage = []

        def walk(d, depth=0):
            if depth > 6:
                return
            if isinstance(d, dict):
                if "fillType" in d and "fillLevel" in d and num(d.get("fillLevel")) > 0.01:
                    storage.append({"type": d["fillType"], "level": round(num(d["fillLevel"]), 1)})
                for k, val in d.items():
                    if k not in ("fillType", "fillLevel"):
                        walk(val, depth + 1)
            elif isinstance(d, list):
                for i in d:
                    walk(i, depth + 1)
        walk(p)
        animals = 0
        for key in ("husbandryAnimals", "husbandry"):
            def count_animals(d, depth=0):
                c = 0
                if depth > 6:
                    return 0
                if isinstance(d, dict):
                    if "numAnimals" in d:
                        c += int(num(d["numAnimals"]))
                    for val in d.values():
                        c += count_animals(val, depth + 1)
                elif isinstance(d, list):
                    for i in d:
                        c += count_animals(i, depth + 1)
                return c
            if key in p:
                animals += count_animals(p[key])
        merged = {}
        for s in storage:
            merged[s["type"]] = round(merged.get(s["type"], 0) + s["level"], 1)
        fn = p.get("filename") or ""
        out.append({
            "id": p.get("uniqueId") or p.get("id"),
            "name": base_name(fn),
            "filename": fn,
            "farmId": p.get("farmId", 0),
            "price": p.get("price"),
            "age": p.get("age"),
            "productions": prods,
            "storage": [{"type": k, "level": v} for k, v in sorted(merged.items(), key=lambda x: -x[1])][:20],
            "animals": animals,
            "isMod": fn.lower().startswith("$moddir$"),
        })
    return out


def build_economy(ec):
    e = g(ec, "economy", default={}) or {}
    prices = []
    for ft in as_list(g(e, "fillTypes", "fillType")):
        if not isinstance(ft, dict):
            continue
        hist = {}
        for p in as_list(g(ft, "history", "period")):
            if isinstance(p, dict) and "period" in p:
                hist[p["period"]] = p.get("#text")
        prices.append({"fillType": ft.get("fillType"), "totalAmount": ft.get("totalAmount"), "history": hist})
    demands = []
    for d in as_list(g(e, "greatDemands", "greatDemand")):
        if isinstance(d, dict):
            demands.append({
                "fillType": d.get("fillTypeName"),
                "station": d.get("stationName") or d.get("uniqueId"),
                "multiplier": d.get("demandMultiplier"),
                "startDay": d.get("demandStartDay"),
                "startHour": d.get("demandStartHour"),
                "durationH": d.get("demandDuration"),
                "isRunning": d.get("isRunning"),
                "isValid": d.get("isValid"),
            })
    return {"prices": prices, "greatDemands": demands}


def build_missions(ms):
    out = []
    root = g(ms, "missions", default={}) or {}
    for key, items in root.items():
        for m in as_list(items):
            if not isinstance(m, dict):
                continue
            field = g(m, "field", "id") or m.get("fieldId")
            out.append({
                "type": m.get("type") or key,
                "status": m.get("status"),
                "reward": m.get("reward") or g(m, "info", "reward"),
                "farmId": m.get("farmId") or g(m, "info", "farmId"),
                "fieldId": field,
            })
    return out


def build_overview(meta):
    cs = load_raw("careerSavegame")
    career = build_career(cs) if cs else {}
    env = load_raw("environment")
    farmlands = build_farmlands(load_raw("farmland"))
    fields = build_fields(load_raw("fields"), farmlands, career)
    farms = build_farms(load_raw("farms"), load_raw("players"))
    vehicles = build_vehicles(load_raw("vehicles"))
    placeables = build_placeables(load_raw("placeables"))
    economy = build_economy(load_raw("economy"))
    missions = build_missions(load_raw("missions"))
    owned = [f for f in fields if f["isOwned"]]
    summary = {
        "fields": len(fields),
        "ownedFields": len(owned),
        "ownedFarmlands": sum(1 for f in farmlands if f["farmId"]),
        "needLime": sum(1 for f in owned if "lime" in f["needs"]),
        "needFertilizer": sum(1 for f in owned if "fertilizer" in f["needs"]),
        "needPlow": sum(1 for f in owned if "plow" in f["needs"]),
        "weeds": sum(1 for f in owned if "weeds" in f["needs"]),
        "vehicles": sum(1 for v in vehicles if v["kind"] == "vehicle"),
        "pallets": sum(1 for v in vehicles if v["kind"] == "pallet"),
        "placeables": len(placeables),
        "animals": sum(p["animals"] for p in placeables),
        "activeMissions": len(missions),
    }
    return {
        "game": "Farming Simulator 25",
        "key": "fs25",
        "sync": meta,
        "summary": summary,
        "career": career,
        "environment": build_environment(env) if env else {},
        "farms": farms,
        "farmlands": farmlands,
        "fields": fields,
        "vehicles": vehicles,
        "placeables": placeables,
        "economy": economy,
        "missions": missions,
    }


# --------------------------------------------------------------------------- io helpers
def read_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def write_if_changed(path, obj, ignore_keys=()):
    """Write JSON only when content (minus volatile keys) differs. Returns True if written."""
    old = read_json(path, None)

    def strip(o):
        if isinstance(o, dict):
            return {k: strip(v) for k, v in o.items() if k not in ignore_keys}
        return o
    if old is not None and strip(old) == strip(obj):
        return False
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write("\n")
    return True


# --------------------------------------------------------------------------- main
def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    state = read_json(STATE_FILE, {})
    force = (os.environ.get("FORCE_MODE") or "auto").strip().lower()

    ftp = connect()
    save_dir = find_save_dir(ftp, state)
    files = list_dir(ftp, save_dir)
    xml_files = {n: i for n, i in files.items() if i["type"] == "file" and n.lower().endswith(".xml")}
    if "careerSavegame.xml" not in xml_files:
        sys.exit(f"careerSavegame.xml not found in {save_dir}")

    # ---- who is online?
    presence = players_from_stats_url()
    if presence is None:
        presence = players_from_log(ftp, save_dir) or {"source": "none", "names": [], "count": 0}
    autosave = num(g(read_json(os.path.join(RAW_DIR, "careerSavegame.json"), {}),
                     "careerSavegame", "settings", "autoSaveInterval"), 15) or 15
    save_mtime = xml_files["careerSavegame.xml"].get("mtime")
    save_age = (time.time() - save_mtime) / 60 if save_mtime else None
    fresh = save_age is not None and save_age <= autosave * 2 + 5

    if presence["source"] == "stats" and presence.get("reachable"):
        active, reason = presence["count"] > 0, f"stats feed: {presence['count']} online"
    elif presence["count"] > 0:
        active, reason = True, f"server log: {presence['count']} online"
    elif fresh:
        active, reason = True, f"savegame written {save_age:.0f} min ago"
    else:
        active = False
        reason = "nobody online" + (f" (last save {save_age:.0f} min ago)" if save_age is not None else "")

    first_run = not state.get("lastFull")
    if force == "full" or (force == "auto" and (active or first_run)):
        mode = "full"
        wanted = sorted(xml_files)
    else:
        mode = "light"
        wanted = [f for f in LIGHT_FILES if f in xml_files]
    log(f"Mode: {mode.upper()}  ({reason}{'; first run' if first_run and not active else ''})")

    # ---- download only what changed
    mtimes = state.get("mtimes", {})
    changed = []
    for name in wanted:
        info = xml_files[name]
        stem = name[:-4]
        raw_path = os.path.join(RAW_DIR, f"{stem}.json")
        if info.get("mtime") and mtimes.get(name) == info["mtime"] and os.path.exists(raw_path):
            continue
        if info.get("size", 0) > MAX_XML_BYTES:
            log(f"  skip {name} (too large: {info['size']} bytes)")
            continue
        try:
            data = download(ftp, f"{save_dir.rstrip('/')}/{name}")
            obj = xml_bytes_to_json(data)
        except Exception as e:
            log(f"  ! {name}: {e}")
            continue
        if write_if_changed(raw_path, obj):
            changed.append(name)
        mtimes[name] = info.get("mtime")
    try:
        ftp.quit()
    except Exception:
        pass
    log(f"Changed files: {', '.join(changed) if changed else 'none'}")

    ts = now_iso()
    state.update({
        "saveDir": save_dir,
        "mtimes": mtimes,
        "lastCheck": ts,
        "lastMode": mode,
        "lastFull": ts if mode == "full" else state.get("lastFull"),
        "lastLight": ts if mode == "light" else state.get("lastLight"),
    })
    if changed:
        state["lastChange"] = ts

    players = {
        "online": presence["count"],
        "names": presence.get("names", []),
        "capacity": presence.get("capacity"),
        "source": presence["source"],
    }
    meta = {
        "mode": mode,
        "active": active,
        "reason": reason,
        "players": players,
        "serverName": presence.get("serverName"),
        "serverVersion": presence.get("version"),
        "saveDir": save_dir,
        "saveAgeMin": round(save_age, 1) if save_age is not None else None,
        "lastCheck": ts,
        "lastChange": state.get("lastChange"),
        "lastFull": state["lastFull"],
        "lastLight": state["lastLight"],
        "files": sorted(f[:-4] for f in xml_files),
        "changedFiles": changed,
    }
    overview = build_overview(meta)

    # Only rewrite when something other than the timestamps changed (keeps idle runs commit-free)
    volatile = ("lastCheck", "lastFull", "lastLight", "mode", "saveAgeMin", "changedFiles", "reason")
    wrote = write_if_changed(OVERVIEW_FILE, overview, ignore_keys=volatile)

    if wrote or changed:
        hist = read_json(HISTORY_FILE, [])
        env = overview.get("environment", {})
        farm_money = {str(f["id"]): f.get("money") for f in overview["farms"] if f.get("id")}
        point = {"t": ts, "day": env.get("day"), "time": env.get("time"),
                 "money": overview["career"].get("money"), "farms": farm_money,
                 "online": players["online"]}
        if not hist or (hist[-1].get("day"), hist[-1].get("time"), hist[-1].get("money")) != \
                (point["day"], point["time"], point["money"]):
            hist.append(point)
        write_if_changed(HISTORY_FILE, hist[-600:])
        write_if_changed(STATE_FILE, state)
        log("Data updated.")
    else:
        log("No data changes - nothing to commit.")


if __name__ == "__main__":
    main()
