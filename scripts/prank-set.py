#!/usr/bin/env python3
"""Turn a prank on/off for one friend code: writes pranks/{CODE} in Kevin's Realtime Database."""
import base64, json, os, sys, urllib.request
DB = "https://entertainment-71888-default-rtdb.firebaseio.com"
code = "".join(c for c in (os.environ.get("CODE") or "").upper() if c.isalnum())
on = (os.environ.get("ENABLED") or "true").lower() in ("true", "on", "yes", "1")
chance = max(0.0, min(1.0, float(os.environ.get("CHANCE") or 0.2)))
if not code: sys.exit("CODE is required")
raw = os.environ["GCP_SA_KEY_WEBSITE"].strip()
from google.oauth2 import service_account
from google.auth.transport.requests import Request
info = json.loads(raw if raw.startswith("{") else base64.b64decode(raw).decode())
cred = service_account.Credentials.from_service_account_info(info, scopes=["https://www.googleapis.com/auth/firebase.database", "https://www.googleapis.com/auth/userinfo.email"]); cred.refresh(Request())
body = json.dumps({"jumpscare": True, "chance": chance, "from": os.environ.get("FROM") or "Werewolf"}) if on else "null"
req = urllib.request.Request(f"{DB}/pranks/{code}.json", data=body.encode(), method="PUT", headers={"Authorization": "Bearer " + cred.token, "Content-Type": "application/json"})
print("pranks/" + code, "->", urllib.request.urlopen(req, timeout=60).read().decode())
