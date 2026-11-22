// Shared game controller support for every game in games/mobile (plain script: window.WWPad).
// Works with a PS5 DualSense, PS4 DualShock, Xbox or any "standard" Bluetooth/USB controller that the browser
// sees through the Gamepad API (Chrome / Edge / Samsung Internet on Android, Safari on iPhone/iPad, any desktop browser).
// The browser only reports a controller after a button is pressed once on it, so games show a hint until then.
//
// Standard button numbers (PlayStation name / Xbox name):
//   0 Cross/A  1 Circle/B  2 Square/X  3 Triangle/Y  4 L1/LB  5 R1/RB  6 L2/LT  7 R2/RT
//   8 Create(Share)/View  9 Options/Menu  10 L3  11 R3  12 D-pad up  13 down  14 left  15 right  16 PS/Guide
// Axes: 0 left stick X, 1 left stick Y, 2 right stick X, 3 right stick Y (-1..1, up is negative).
(function () {
  'use strict';
  var DEAD = 0.15, prev = [], cur = [], listeners = { connect: [], disconnect: [], press: [] }, hinted = false;
  var B = { cross: 0, circle: 1, square: 2, triangle: 3, l1: 4, r1: 5, l2: 6, r2: 7, share: 8, options: 9, l3: 10, r3: 11, up: 12, down: 13, left: 14, right: 15, ps: 16 };

  function pad() {
    var list = (navigator.getGamepads && navigator.getGamepads()) || [];
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].connected) return list[i];
    return null;
  }
  function dz(v) { return Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD); }
  function val(p, i) { var b = p && p.buttons[i]; return b ? (typeof b === 'object' ? (b.value || (b.pressed ? 1 : 0)) : b) : 0; }

  // call once per animation frame (games do this in their own loop); fires 'press' for each newly pressed button
  function poll() {
    var p = pad(); prev = cur; cur = [];
    if (!p) return null;
    for (var i = 0; i < p.buttons.length; i++) cur[i] = val(p, i) > 0.5;
    for (i = 0; i < cur.length; i++) if (cur[i] && !prev[i]) listeners.press.forEach(function (f) { try { f(i); } catch (e) {} });
    return p;
  }
  function state() {
    var p = pad();
    if (!p) return null;
    var ax = p.axes || [];
    return {
      id: p.id,
      lx: dz(ax[0] || 0), ly: dz(ax[1] || 0), rx: dz(ax[2] || 0), ry: dz(ax[3] || 0),
      l2: val(p, B.l2), r2: val(p, B.r2),
      held: function (name) { var i = typeof name === 'number' ? name : B[name]; return val(p, i) > 0.5; },
      // left stick, falling back to the D-pad
      moveX: function () { var x = dz(ax[0] || 0); return x || (val(p, B.right) - val(p, B.left)); },
      moveY: function () { var y = dz(ax[1] || 0); return y || (val(p, B.down) - val(p, B.up)); }
    };
  }
  function pressed(name) { var i = typeof name === 'number' ? name : B[name]; return !!cur[i] && !prev[i]; }
  // short rumble (Chrome/Edge on Android and desktop; ignored where not supported)
  function rumble(strong, weak, ms) {
    var p = pad(); if (!p) return;
    try {
      if (p.vibrationActuator && p.vibrationActuator.playEffect) p.vibrationActuator.playEffect('dual-rumble', { duration: ms || 120, strongMagnitude: strong || 0.5, weakMagnitude: weak || 0.3 });
      else if (p.hapticActuators && p.hapticActuators[0]) p.hapticActuators[0].pulse(strong || 0.5, ms || 120);
    } catch (e) {}
  }
  function name(id) {
    id = String(id || '').toLowerCase();
    if (/dualsense|054c.*0ce6|054c.*0df2/.test(id)) return 'PS5 controller';
    if (/dualshock|054c/.test(id)) return 'PlayStation controller';
    if (/xbox|xinput|045e/.test(id)) return 'Xbox controller';
    return 'Controller';
  }
  function on(ev, f) { (listeners[ev] = listeners[ev] || []).push(f); }

  window.addEventListener('gamepadconnected', function (e) { hinted = true; listeners.connect.forEach(function (f) { try { f(name(e.gamepad.id), e.gamepad); } catch (x) {} }); });
  window.addEventListener('gamepaddisconnected', function (e) { listeners.disconnect.forEach(function (f) { try { f(name(e.gamepad.id)); } catch (x) {} }); });

  window.WWPad = { B: B, poll: poll, state: state, pressed: pressed, rumble: rumble, name: name, on: on, connected: function () { return !!pad(); },
    supported: function () { return !!navigator.getGamepads; } };
})();
