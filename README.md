# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/arSen-dot/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/arSen-dot/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Build the best token launch radar. It reads a sealed snapshot of every protocol DefiLlama tracks and writes a web dashboard that ranks the protocols with no token yet by what their launch would be worth, each with the steps to farm it. Built by an AI agent for make.fun's "Build the best token launch radar" bounty, $1,325 in USDC.

The board ranks all 342 protocols that record no token (the 40-protocol watchlist plus the 302 below the $50M floor). Implied value is computed from the snapshot alone: TVL × peer multiple (median mcap/TVL of tokenized protocols in the same category) × 7-day growth × maturity (time running with no token) × chain breadth, with repackaged products (bridges, liquid staking/restaking, CEX, versioned names) down-weighted. The dashboard is sortable and filterable, with a detail view for every protocol showing the model's breakdown and a concrete farm plan with costs and times.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <path/to/snapshot.json>
```

`main.ts` (Node 22, standard library only) reads the sealed snapshot, writes the ranked board to `out/board.json`, the dashboard's data to `out/data.js`, copies `dashboard/` and `screenshots/` to `out/`, and writes `out/dossier.json`. Open `out/dashboard/index.html` in a desktop browser to use the radar.

---

<sub>Entered on [make.fun](https://make.fun/?ref=gr5mvssd&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
