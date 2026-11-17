// StreamHook.gs  -  replaces Code.gs in the "Youtube Chat to Twitch" Apps Script project.
//
// That project already has the YouTube service turned on and is already deployed
// as a web app, so it is the easiest place for these two jobs:
//   1. wakeStreamSync()  every minute: if a channel below is live on Twitch, visit
//      the ww-stream-sync Render service so it wakes up / stays awake.
//   2. doPost()          ww-stream-sync sends the new title here; this changes the
//      title of the live YouTube broadcast on this Google account.
//
// The old chat-to-Twitch code is gone on purpose: ww-stream-sync now posts the
// YouTube/TikTok chat itself, with a Twitch login that refreshes on its own.
// No tokens or webhook links are kept in this file.
//
// SETUP (once):
//   1. Paste this file over Code.gs and save.
//   2. Run setupStreamHook  (approve the permissions it asks for).
//   3. Deploy > Manage deployments > pencil on the existing web app > Version: New version > Deploy.
//      (keeps the same /exec link)
//   4. Open View > Logs (Executions) for setupStreamHook and copy the two lines it printed
//      into Firebase  user_secrets/<your email key>:  youtube_hook_url  and  youtube_hook_secret

const STREAM_HOOK = {
  syncUrl: "https://ww-stream-sync.onrender.com",
  channels: ["werewolf3788"]          // Twitch channels whose going live should wake the service
};

function isTwitchLive_(channel) {
  try {
    const res = UrlFetchApp.fetch("https://decapi.me/twitch/uptime/" + encodeURIComponent(channel), { muteHttpExceptions: true });
    const t = res.getContentText().toLowerCase();
    return res.getResponseCode() === 200 && t.indexOf("offline") === -1 && t.indexOf("error") === -1;
  } catch (err) {
    return false;
  }
}

// Trigger: every minute.
function wakeStreamSync() {
  const live = STREAM_HOOK.channels.some(isTwitchLive_);
  if (!live) return;
  try {
    UrlFetchApp.fetch(STREAM_HOOK.syncUrl + "/wake", { muteHttpExceptions: true });
  } catch (err) {
    Logger.log("Wake failed (service still starting?): " + err);
  }
}

// Called by ww-stream-sync: {"type":"youtube_title","secret":"...","title":"..."}
function doPost(e) {
  const out = function (s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.TEXT); };
  let data;
  try { data = JSON.parse((e && e.postData && e.postData.contents) || "{}"); } catch (err) { return out("bad json"); }
  const secret = PropertiesService.getScriptProperties().getProperty("STREAM_HOOK_SECRET");
  if (!secret || data.secret !== secret) return out("denied");
  if (data.type === "youtube_title") return out(setYouTubeTitle_(String(data.title || "")));
  return out("unknown type");
}

function doGet() {
  return ContentService.createTextOutput("StreamHook running").setMimeType(ContentService.MimeType.TEXT);
}

function setYouTubeTitle_(title) {
  title = title.trim().substring(0, 100);
  if (!title) return "empty title";
  try {
    const list = YouTube.LiveBroadcasts.list("id,snippet", { broadcastStatus: "active", broadcastType: "all", maxResults: 5 });
    const items = (list && list.items) || [];
    if (!items.length) return "no active YouTube broadcast";
    const vids = YouTube.Videos.list("id,snippet", { id: items[0].id });
    if (!vids.items || !vids.items.length) return "broadcast video not found";
    const v = vids.items[0];
    if (v.snippet.title === title) return "ok same";
    v.snippet.title = title;
    YouTube.Videos.update({ id: v.id, snippet: v.snippet }, "snippet");   // 50 quota units, only when the title changes
    return "ok updated";
  } catch (err) {
    Logger.log("YouTube title error: " + err);
    return "error: " + err;
  }
}

// Run ONCE by hand.
function setupStreamHook() {
  const p = PropertiesService.getScriptProperties();
  let secret = p.getProperty("STREAM_HOOK_SECRET");
  if (!secret) {
    secret = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
    p.setProperty("STREAM_HOOK_SECRET", secret);
  }
  // Old copies of the Twitch token / Discord link are no longer used.
  ["LAST_STREAM_STATE", "LAST_STREAM_TITLE", "LAST_STREAM_GAME"].forEach(function (k) { p.deleteProperty(k); });

  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("wakeStreamSync").timeBased().everyMinutes(1).create();

  Logger.log("youtube_hook_url    = " + (ScriptApp.getService().getUrl() || "(deploy the web app first, then run this again)"));
  Logger.log("youtube_hook_secret = " + secret);
  Logger.log("Copy both into Firebase user_secrets/<your email key>. Trigger wakeStreamSync created (every minute).");
}

// Optional: run by hand while live to test the YouTube side.
function testYouTubeTitle() {
  Logger.log(setYouTubeTitle_("Test title from StreamHook"));
}
