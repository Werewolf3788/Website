#!/usr/bin/env python3
"""
Free Firebase Hosting storage before a deploy (run by .github/workflows/deploy.yml).

Firebase Hosting keeps every deployed version unless told otherwise. On the free
plan that fills the storage quota and new deploys fail with HTTP 429
("You have exceeded the Hosting storage quota").

This script:
  1. sets the live channel to keep only the newest KEEP releases from now on, and
  2. deletes stored versions that are not used by those newest releases.

The site that is live right now is never touched: its version is always kept.
Uses the same GCP_SA_KEY_WEBSITE service account as the deploy step.
"""
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request

SITE = os.environ.get("HOSTING_SITE", "entertainment-71888")
KEEP = int(os.environ.get("HOSTING_KEEP_RELEASES", "5"))
API = os.environ.get("HOSTING_API", "https://firebasehosting.googleapis.com/v1beta1")


def token():
    raw = (os.environ.get("GCP_SA_KEY_WEBSITE") or "").strip()
    if not raw:
        sys.exit("GCP_SA_KEY_WEBSITE is missing.")
    from google.oauth2 import service_account
    from google.auth.transport.requests import Request
    info = json.loads(raw if raw.startswith("{") else base64.b64decode(raw).decode())
    cred = service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/cloud-platform"])
    cred.refresh(Request())
    return cred.token


def call(tok, method, url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": f"Bearer {tok}", "Content-Type": "application/json"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                txt = r.read().decode() or "{}"
                return json.loads(txt)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503) and attempt < 3:
                time.sleep(2 * (attempt + 1))
                continue
            raise RuntimeError(f"{method} {url} -> HTTP {e.code}: {e.read().decode()[:300]}")


def paged(tok, url, key):
    out, page = [], ""
    while True:
        sep = "&" if "?" in url else "?"
        j = call(tok, "GET", f"{url}{sep}pageSize=100" + (f"&pageToken={page}" if page else ""))
        out += j.get(key, [])
        page = j.get("nextPageToken")
        if not page:
            return out


def main():
    tok = token()
    site = f"{API}/sites/{SITE}"

    # 1) keep only the newest KEEP releases from now on
    try:
        call(tok, "PATCH", f"{site}/channels/live?updateMask=retainedReleaseCount", {"retainedReleaseCount": KEEP})
        print(f"Live channel now keeps the newest {KEEP} releases.")
    except Exception as e:
        print(f"Could not change the release setting ({e}) - continuing with cleanup.")

    # 2) versions used by the newest KEEP releases (newest first) are kept
    releases = paged(tok, f"{site}/channels/live/releases", "releases")
    releases.sort(key=lambda r: r.get("releaseTime", ""), reverse=True)
    keep = {r["version"]["name"] for r in releases[:KEEP] if r.get("version")}
    print(f"{len(releases)} releases found; keeping {len(keep)} version(s).")
    if not keep:
        print("No releases found - nothing deleted.")
        return

    versions = paged(tok, f"{site}/versions", "versions")
    old = [v for v in versions if v["name"] not in keep and v.get("status") != "DELETED"]
    freed, deleted = 0, 0
    for v in old:
        try:
            call(tok, "DELETE", f"{API}/{v['name']}")
            deleted += 1
            freed += int(v.get("versionBytes") or 0)
        except Exception as e:
            print(f"  could not delete {v['name']}: {e}")
    print(f"Deleted {deleted} old version(s), about {freed / 1048576:.0f} MB freed. "
          f"{len(versions) - deleted} version(s) left.")


if __name__ == "__main__":
    main()
