/* The site's game tracker files (public/games/*.json): the extension uses each game's real name and its
 * player_profile layout (e.g. the "Wildlands profile" card) so View more matches the site. Read once at start. */
"use strict";
const fs = require("fs");
const path = require("path");

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function loadGameDefs(dir) {
    dir = dir || path.join(__dirname, "..", "..", "..", "public", "games");
    const byKey = new Map();
    let files = [];
    try { files = fs.readdirSync(dir).filter((f) => /\.json$/i.test(f)); } catch (e) { return () => null; }
    for (const f of files) {
        let d; try { d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch (e) { continue; }
        const pp = d.player_profile && Array.isArray(d.player_profile.groups) ? d.player_profile : null;
        const def = { name: d.game || "", title: pp ? pp.title : "", groups: pp ? pp.groups : null };
        [d.gameId, d.game, f.replace(/\.json$/i, "")].forEach((k) => { if (norm(k)) byKey.set(norm(k), def); });
    }
    return (id) => byKey.get(norm(id)) || null;
}

module.exports = { loadGameDefs };
