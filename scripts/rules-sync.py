#!/usr/bin/env python3
"""Compare (default) or publish (RULES_MODE=apply) database.rules.json to Kevin's Realtime Database.
Run by .github/workflows/rules.yml with the same GCP_SA_KEY_WEBSITE service account the site deploy uses.
Compare mode is read-only: it prints which top-level nodes the live rules have that the repo file lacks (and vice versa)."""
import base64, json, os, sys, urllib.request, urllib.error

DB = os.environ.get("RTDB_URL", "https://entertainment-71888-default-rtdb.firebaseio.com")
MODE = os.environ.get("RULES_MODE", "compare")

def token():
    raw = (os.environ.get("GCP_SA_KEY_WEBSITE") or "").strip()
    if not raw: sys.exit("GCP_SA_KEY_WEBSITE is missing.")
    from google.oauth2 import service_account
    from google.auth.transport.requests import Request
    info = json.loads(raw if raw.startswith("{") else base64.b64decode(raw).decode())
    cred = service_account.Credentials.from_service_account_info(info, scopes=["https://www.googleapis.com/auth/firebase.database", "https://www.googleapis.com/auth/userinfo.email"])
    cred.refresh(Request()); return cred.token

def call(method, tok, data=None):
    req = urllib.request.Request(f"{DB}/.settings/rules.json", data=data, method=method, headers={"Authorization": "Bearer " + tok, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r: return r.status, r.read().decode()
    except urllib.error.HTTPError as e: return e.code, e.read().decode()

tok = token()
code, body = call("GET", tok)
if code != 200: sys.exit(f"Could not read the live rules: HTTP {code} {body[:300]}")
live = json.loads(body.split("\n", 1)[0] if body.lstrip().startswith("//") else body) if body.strip().startswith("{") else json.loads(body[body.index("{"):])
repo = json.load(open("database.rules.json"))
lr, rr = live.get("rules", {}), repo.get("rules", {})
print("live top-level nodes :", sorted(lr))
print("repo top-level nodes :", sorted(rr))
print("ONLY in live (would be REMOVED by publishing):", sorted(set(lr) - set(rr)))
print("ONLY in repo (would be ADDED):", sorted(set(rr) - set(lr)))
print("changed nodes:", sorted(k for k in set(lr) & set(rr) if lr[k] != rr[k]))
for k in sorted(k for k in set(lr) & set(rr) if lr[k] != rr[k]):
    print(f"--- {k} LIVE: {json.dumps(lr[k])}")
    print(f"--- {k} REPO: {json.dumps(rr[k])}")
if MODE == "apply":
    code, body = call("PUT", tok, json.dumps(repo).encode())
    print(f"PUBLISH -> HTTP {code} {body[:300]}")
    if code != 200: sys.exit(1)
