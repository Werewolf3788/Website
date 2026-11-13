#!/usr/bin/env python3
"""Read-only diagnostic: where does a friend code point, and which user records carry it? Prints only keys + friend codes (no secrets)."""
import base64, json, os, sys, urllib.request, urllib.parse
DB = "https://entertainment-71888-default-rtdb.firebaseio.com"
CODE = (os.environ.get("CODE") or "").strip().upper()
raw = os.environ["GCP_SA_KEY_WEBSITE"].strip()
from google.oauth2 import service_account
from google.auth.transport.requests import Request
info = json.loads(raw if raw.startswith("{") else base64.b64decode(raw).decode())
cred = service_account.Credentials.from_service_account_info(info, scopes=["https://www.googleapis.com/auth/firebase.database", "https://www.googleapis.com/auth/userinfo.email"]); cred.refresh(Request())
def get(path, q=""):
    req = urllib.request.Request(f"{DB}/{path}.json{q}", headers={"Authorization": "Bearer " + cred.token})
    try: return json.loads(urllib.request.urlopen(req, timeout=60).read().decode())
    except Exception as e: return f"ERR {e}"
print("friend_codes/%s =" % CODE, json.dumps(get("friend_codes/" + CODE)))
keys = get("users", "?shallow=true")
print("users:", len(keys) if isinstance(keys, dict) else keys)
for k in sorted(keys if isinstance(keys, dict) else []):
    fc = get("users/" + k + "/friend_code"); av = get("users/" + k + "/avatar_url"); un = get("users/" + k + "/username")
    mark = "  <== MATCH" if str(fc or "").upper() == CODE else ""
    print(f"  {k}: friend_code={fc!r} username={un!r} avatar={'yes' if av else 'no'}{mark}")
all_codes = get("friend_codes")
if isinstance(all_codes, dict):
    print("friend_codes entries:", len(all_codes))
    for c, v in sorted(all_codes.items()): print("  ", c, "->", json.dumps(v)[:120])
