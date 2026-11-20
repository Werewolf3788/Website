#!/usr/bin/env python3
"""One-time tidy-up of Kevin's Realtime Database (entertainment-71888): moves the old top-level
folders into a few groups (accounts/, social/, site/, platforms/, mobilegames/).

Run by .github/workflows/rtdb-regroup.yml.  MODE:
  copy     Publish rules that allow BOTH the old and new places, then copy every old folder to its new
           place. Old folders are left untouched as a backup. Safe to run more than once: anything
           already at the new place wins, old entries only fill in what is missing.
  check    Read-only. Shows, for every folder, how many entries the old and new places have.
  cleanup  Only after the site has been checked: deletes the old folders (and the retired pranks
           folder) and publishes the final rules from database.rules.json.
"""
import base64, json, os, sys, urllib.request, urllib.error

DB = "https://entertainment-71888-default-rtdb.firebaseio.com"
MODE = (os.environ.get("MODE") or "check").strip().lower()
MOVES = {
    "friend_codes": "accounts/friend_codes", "friend_requests": "accounts/friend_requests",
    "profiles": "accounts/profiles", "profileMedia": "accounts/profileMedia",
    "public_profiles": "accounts/public_profiles", "presence": "accounts/presence",
    "push_subscriptions": "accounts/push_subscriptions", "auth_links": "accounts/auth_links",
    "discord_links": "accounts/discord_links", "discord_bridge": "accounts/discord_bridge",
    "messages": "social/messages", "userThreads": "social/userThreads", "achFeed": "social/achFeed",
    "music_releases": "site/music_releases", "wifi": "site/wifi", "wifi_index": "site/wifi_index",
    "games": "platforms/games", "games_catalog": "platforms/games_catalog", "xbox": "platforms/xbox",
    "steam_users": "platforms/steam_users", "steam_games": "platforms/steam_games",
    "steam_vanity": "platforms/steam_vanity",
    "game_rooms": "mobilegames/rooms", "game_leaders": "mobilegames/leaders", "games_saves": "mobilegames/saves",
}
RETIRED = ["pranks"]


def token():
    raw = (os.environ.get("GCP_SA_KEY_WEBSITE") or "").strip()
    if not raw: sys.exit("GCP_SA_KEY_WEBSITE is missing.")
    from google.oauth2 import service_account
    from google.auth.transport.requests import Request
    info = json.loads(raw if raw.startswith("{") else base64.b64decode(raw).decode())
    cred = service_account.Credentials.from_service_account_info(info, scopes=[
        "https://www.googleapis.com/auth/firebase.database", "https://www.googleapis.com/auth/userinfo.email"])
    cred.refresh(Request()); return cred.token


TOK = token()


def call(method, path, data=None, query=""):
    body = None if data is None else json.dumps(data).encode()
    req = urllib.request.Request(f"{DB}/{path}.json{query}", data=body, method=method,
                                 headers={"Authorization": "Bearer " + TOK, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=300) as r: return json.loads(r.read().decode() or "null")
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} /{path} failed: HTTP {e.code} {e.read().decode()[:300]}")


def count(path):
    v = call("GET", path, query="?shallow=true")
    return len(v) if isinstance(v, dict) else (0 if v is None else 1)


def publish_rules(with_legacy):
    rules = json.load(open("database.rules.json"))
    if with_legacy:
        legacy = json.load(open("scripts/rtdb-legacy-rules.json"))["legacy_rules"]
        for k, v in legacy.items(): rules["rules"].setdefault(k, v)
    req = urllib.request.Request(f"{DB}/.settings/rules.json", data=json.dumps(rules).encode(), method="PUT",
                                 headers={"Authorization": "Bearer " + TOK, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r: print("Rules published:", r.read().decode()[:200])
    except urllib.error.HTTPError as e:
        sys.exit(f"Publishing rules failed: HTTP {e.code} {e.read().decode()[:400]}")


if MODE == "copy":
    publish_rules(with_legacy=True)
    for old, new in MOVES.items():
        src = call("GET", old)
        if src is None: print(f"  {old:20} empty, nothing to copy"); continue
        dst = call("GET", new)
        if isinstance(src, dict) and isinstance(dst, dict):
            merged = dict(src); merged.update(dst)          # entries already at the new place win
        else:
            merged = dst if dst is not None else src
        call("PUT", new, merged)
        n = len(merged) if isinstance(merged, dict) else 1
        print(f"  {old:20} -> {new:28} {n} entries")
    print("Copy done. Old folders are still there as a backup. Check the site, then run cleanup.")

elif MODE == "check":
    for old, new in MOVES.items():
        print(f"  {old:20} old: {count(old):5}   {new:28} new: {count(new):5}")
    for r in RETIRED: print(f"  {r:20} old: {count(r):5}   (will be deleted)")

elif MODE == "cleanup":
    missing = [old for old, new in MOVES.items() if count(old) and not count(new)]
    if missing: sys.exit("Stopped: these have not been copied yet, run copy first: " + ", ".join(missing))
    for old in list(MOVES) + RETIRED:
        call("DELETE", old); print("  deleted", old)
    publish_rules(with_legacy=False)
    print("Cleanup done.")
else:
    sys.exit("MODE must be copy, check or cleanup")
