#!/usr/bin/env python3
"""Add the Music (Twitch category) entry to overlay/stream_overlay_theme.json."""
import json

PATH = 'overlay/stream_overlay_theme.json'
KEY = 'category_music'
ALIASES = ['music', 'dj', 'music production', 'live music', 'beats', 'lofi']
EXTRA = (
    ' Non-game Twitch categories get their own entry too: "category_music" (name Music, neon '
    'magenta/aqua, equalizer-style lights effect) is reachable through "categories".music and '
    'through the byName aliases music, dj, music production, live music, beats, lofi.'
)

MUSIC = {
    'name': 'Music (Twitch category)',
    'platform': 'Twitch category',
    'aliases': sorted(ALIASES),
    'colors': {
        'primary': '#241046',
        'secondary': '#4b1f8a',
        'tertiary': '#a52690',
        'accent': '#ff2d95',
        'accent2': '#00e0ff',
        'border': '#54456f',
        'border2': '#ff4ca5',
        'panel': '#06030d',
        'panel2': '#0b0515',
        'text': '#f2fdff',
        'muted': '#a39bb1',
        'highlight': '#73eeff',
        'glow': '#ff2d95',
        'shadow': '#040207',
        'ink': '#ffffff',
        'inkAccent': '#ffffff',
    },
    'gradient': ['#00e0ff', '#ff2d95', '#241046'],
    'palette': ['#241046', '#4b1f8a', '#a52690', '#ff2d95', '#00e0ff', '#73eeff', '#54456f', '#0b0515'],
    'effect': {'type': 'lights', 'colors': ['#ff2d95', '#00e0ff']},
}

with open(PATH, encoding='utf-8') as f:
    old = json.load(f)

about = old['_about']
if 'Non-game Twitch categories' not in about:
    about = about.replace('middle of the screen.', 'middle of the screen.' + EXTRA, 1)

games = dict(old['games'])
if KEY not in games:
    games[KEY] = MUSIC

by_name = dict(old['byName'])
for a in ALIASES:
    by_name.setdefault(a, KEY)

out = {
    '_about': about,
    '_usage': old['_usage'],
    'version': 2,
    'updated': '2026-11-27',
    'source': old['source'],
    'channels': old['channels'],
    'matchOrder': old['matchOrder'],
    'categories': {'music': KEY},
    'default': old['default'],
    'games': games,
    'byName': dict(sorted(by_name.items())),
}

with open(PATH, 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
    f.write('\n')

print('games:', len(games), '| names:', len(by_name), '| music ->', out['byName']['music'])
