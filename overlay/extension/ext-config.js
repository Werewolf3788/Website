/* Werewolf Twitch extension: broadcaster config page. Registers the channel with ww-stream-sync and shows
 * the pair code to enter in Overlay Studio. */
(function () {
  'use strict';
  var SYNC = 'https://ww-stream-sync.onrender.com', out = document.getElementById('out');
  function show(h) { out.innerHTML = h; }
  window.Twitch.ext.onAuthorized(function (auth) {
    show('<p>Connecting… (the server can take up to a minute to wake up)</p>');
    var tries = 0;
    (function go() {
      fetch(SYNC + '/ext/register', { method: 'POST', headers: { Authorization: 'Bearer ' + auth.token } })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) {
          if (!x.ok) throw new Error(x.j.error || 'Could not connect');
          var j = x.j;
          show('<p>Your pair code:</p><div class="code">' + j.pairCode + '</div>' +
            (j.paired ? '<p>✅ Paired with your Werewolf account. Change your look and pass any time in Overlay Studio.</p>'
                      : '<p>Finish setup at <a href="https://entertainment-71888.web.app/overlay-studio#extension" target="_blank" rel="noopener">Overlay Studio</a>: enter this code there. Sign in first to show your game tracker and PlayStation info.</p>') +
            '<p style="color:#666">Without pairing, the extension still shows your Twitch game and title.</p>');
        })
        .catch(function (e) { if (++tries < 4) setTimeout(go, 15000); else show('<p>' + e.message + '. Close and reopen this page in a minute.</p>'); });
    }());
  });
}());
