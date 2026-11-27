// "Your turn!" alert for the turn-based games in games/mobile (plain script: window.WWTurn).
// Call WWTurn.update(isMyTurn, muted) whenever the game redraws. When it flips from not-your-turn to your-turn:
//   - a short three-note chime (unless the game is muted),
//   - a buzz on phones that support vibration,
//   - the tab title flashes "🔔 Your turn!" while the game is in the background,
//   - a phone / desktop notification if the game is in the background and notifications are allowed,
//   - one gentle reminder chime 45 seconds later if it is still your turn and the game is still in the background.
(function () {
  'use strict';
  var AC = null, was = false, baseTitle = document.title, flashT = null, remindT = null, mutedNow = false, askedPerm = false;
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } return AC; }
  // phones only allow sound after a tap: wake the audio on the first touch
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
    addEventListener(ev, function () { var a = ac(); if (a && a.state === 'suspended') a.resume().catch(function () {}); }, { passive: true, capture: true });
  });
  function chime(soft) {
    var a = ac(); if (!a || mutedNow) return; if (a.state === 'suspended') a.resume().catch(function () {});
    var t = a.currentTime + 0.02, notes = soft ? [784, 1047] : [659, 880, 1175];
    notes.forEach(function (f, i) {
      var o = a.createOscillator(), g = a.createGain(), at = t + i * 0.14;
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(soft ? 0.12 : 0.22, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.42);
      o.connect(g); g.connect(a.destination); o.start(at); o.stop(at + 0.45);
    });
  }
  function flash(on) {
    clearInterval(flashT); flashT = null;
    if (!on) { document.title = baseTitle; return; }
    var alt = false; flashT = setInterval(function () { alt = !alt; document.title = alt ? '🔔 Your turn!' : baseTitle; }, 1000);
  }
  function notify() {
    if (!document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
    try { var n = new Notification('🔔 Your turn!', { body: baseTitle, tag: 'ww-turn', renotify: true }); n.onclick = function () { focus(); n.close(); }; } catch (e) {}
  }
  function askPermission() {   // asked once, after the player has started playing (browsers need a tap first)
    if (askedPerm || !('Notification' in window) || Notification.permission !== 'default') return; askedPerm = true;
    addEventListener('pointerdown', function once() { removeEventListener('pointerdown', once, true); try { Notification.requestPermission().catch(function () {}); } catch (e) {} }, true);
  }
  function update(mine, muted) {
    mutedNow = !!muted; mine = !!mine;
    if (mine && !was) {
      chime(false);
      try { if (navigator.vibrate) navigator.vibrate([120, 60, 120]); } catch (e) {}
      if (document.hidden) { flash(true); notify(); }
      clearTimeout(remindT); remindT = setTimeout(function () { if (was && document.hidden) { chime(true); notify(); } }, 45000);
      askPermission();
    }
    if (!mine && was) { clearTimeout(remindT); flash(false); }
    was = mine;
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) flash(false); else if (was) flash(true); });
  window.WWTurn = { update: update, chime: chime };
})();
