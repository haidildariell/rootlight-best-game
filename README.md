# ROOTLIGHT — Grow the Deep

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/haidildariell/rootlight-best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/haidildariell/rootlight-best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An original underground root-growing strategy game for [make.fun best-game-01](https://make.fun/bounty/best-game-01).
You are a seed-spirit deep underground. Grow a living root network tile by
tile through soil, stone and water — reach the Heartwell and hold the
connection while it blooms, while grubs crawl from their nests to eat your
roots and your seed.

## How to play

- **Mouse** — click soil next to any root to grow the selected root
- **1 / 2 / 3 / 4** — Taproot (◆1) · Feeder (◆2) · Thornroot (◆3) · Glowbulb (◆2)
- **Space** — start the next wave · **P / Esc** — pause · **M** — mute · **R** — restart level

Feeders planted on gold nutrient pockets earn sap over time; water veins
trickle sap to any root. Thornroots sting grubs that come close; glowbulbs
slow them with light. Grubs eat roots — if they reach the seed it loses
hearts. Lose all hearts and the run ends. Between waves, grow and repair.

## Features

- 8 hand-built levels, from First Sprout to the Mole King boss (level 8)
- 4 root types with distinct jobs, sap economy, nutrient pockets, water veins
- 4 grub kinds (mite, grub, brute, Mole King boss) with tile pathfinding
- Between-wave building, wave-clear bonuses, star ratings, spore meta-shop
  (5 upgrades, 2–3 tiers each) that carries across levels
- 3 difficulties (Sprout / Deep / Abyss) with score multipliers
- Synthesized WebAudio: earth-drone ambience, generative pentatonic melody,
  grow/chomp/thorn/horn effects — no audio files
- Title, level select, how-to, settings, shop, pause, victory (stars + stats)
  and defeat screens; progress saved in the browser
- Fully offline: plain static files, no network requests, no libraries
- Deterministic screenshots: `?shot=<scene>&seed=<n>` replays a fixed scene

## How to run

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` directly from any static file server. Node 22+
is needed only for the `main.ts` entry program, which copies `game/` and
`screenshots/` to `/output` and writes `dossier.json`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
