// Token Radar's model, radar-2: one sealed snapshot in, one ranked board out.
//
// The board ranks EVERY protocol the snapshot records as pre-token (342 of them): the 40
// watchlist protocols are the floor, never the ceiling, and the other 302 are the early radar.
// A protocol is pre-token when its record carries no token at all: no market cap, no CoinGecko
// id and no symbol. Tokenized protocols are never ranked as launch candidates; they are kept
// apart and shown as the market's own values, and as the peers the model prices against.
//
// Implied value follows only from the snapshot's own figures. No protocol name is ever
// special-cased: the same function scores every row, and every constant is stated here and on
// the dashboard's methodology section.
//
//   peer multiple = median mcap_usd / tvl_usd among tokenized protocols in the same category
//                   (at least 3 peers with a market cap, else the global median), clamped to
//                   [0.05, 1.00]. A category's own market is the price of its launches.
//   growth        = clamp(change_7d, -50, 100) per cent
//   growthMult    = 1 + (growth / 100) x 0.5                       in [0.75, 1.50]
//   maturity      = 0.7 + min(age_days, 1095) / 1095 x 0.3        in [0.70, 1.00]
//                   age_days unknown: 365. Older with no token = more pent-up value.
//   breadth       = 1 + min(chains - 1, 5) x 0.02                  in [1.00, 1.10]
//   class         = 1.00 for a genuine launch candidate, 0.02 for a repackaged product:
//                   a bridge, a liquid-staking or restaking product, an exchange, a versioned
//                   deployment, or a name carrying "wrapped" / "staked" / "staking". Such a
//                   product repackages a token that already trades, so it has almost no launch
//                   of its own; the residual 2% is the small chance the wrapper itself ever
//                   issues a distinct token. The rule is the snapshot's own watchlist rule,
//                   applied to the whole board instead of only the floor.
//   implied       = max(1, round(tvl_usd x peerMultiple x growthMult x maturity x breadth x class))
//
// Farm plans are derived the same way, from the protocol's own record (category, chains, TVL,
// age): the action fits the category, the capital fits the TVL, the hold fits the age, and the
// gas fits the chain. No name is special-cased there either.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  peer_min_peers: number;
  peer_floor: number;
  peer_cap: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  breadth_step: number;
  breadth_max_extra: number;
  repackaged_factor: number;
}

export const MODEL: ModelConstants = {
  peer_min_peers: 3,
  peer_floor: 0.05,
  peer_cap: 1.0,
  growth_weight: 0.5,
  growth_floor: -50,
  growth_cap: 100,
  maturity_floor: 0.7,
  maturity_range: 0.3,
  maturity_days: 1095,
  unknown_age_days: 365,
  breadth_step: 0.02,
  breadth_max_extra: 5,
  repackaged_factor: 0.02,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-2';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** How many peer comparables a detail view carries. */
export const PEER_ROWS = 3;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** Whether a row is a genuine launch candidate or a repackaged product. */
export type LaunchClass = 'candidate' | 'repackaged';

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  token_status: 'pre-token';
  launch_class: LaunchClass;
  implied_value_usd: number;
  farm_cost_usd: number;
  model: {
    peer_multiple: number;
    peer_category: string;
    peer_count: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    breadth_multiplier: number;
    class_factor: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** One tokenized peer a detail view prices against. */
export interface PeerRow {
  slug: string;
  name: string;
  tvl_usd: number;
  mcap_usd: number;
  multiple: number;
}

/** The dashboard's view of one row, with its farm plan and its peers. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  launch_class: LaunchClass;
  implied_value_usd: number;
  farm_cost_usd: number;
  peer_multiple: number;
  peer_category: string;
  peer_count: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  breadth_multiplier: number;
  class_factor: number;
  farm_steps: string[];
  peers: PeerRow[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** One category's peer multiple, for the methodology table. */
export interface PeerMultiple {
  category: string;
  peers: number;
  multiple: number;
  fallback: boolean;
}

/** Everything the dashboard renders, from the snapshot. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist: string[];
  watchlist_size: number;
  board_size: number;
  watchlist_implied_usd: number;
  total_implied_usd: number;
  pretoken_tvl_usd: number;
  rows: RadarRow[];
  live: LiveRow[];
  peer_multiples: PeerMultiple[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a non-empty list, else `fallback`. */
function median(values: number[], fallback: number): number {
  if (values.length === 0) return fallback;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Clamp `n` into [lo, hi]. */
function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Categories that repackage a token that already trades (the snapshot's watchlist rule). */
const REPACKAGED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** A name ending in a version marker is a deployment of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** A name carrying a whole word for a wrapped or staked product. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/** A name beginning with an exchange's name. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/i;

/**
 * A row's launch class, from the snapshot's own fields only: the house's watchlist rule,
 * applied to the whole board. A repackaged product has almost no launch of its own.
 */
export function launchClass(p: SnapshotProtocol): LaunchClass {
  if (p.category !== null && REPACKAGED_CATEGORIES.has(p.category)) return 'repackaged';
  if (VERSIONED.test(p.name) || WRAPPED_WORD.test(p.name) || EXCHANGE_PREFIX.test(p.name)) return 'repackaged';
  return 'candidate';
}

/**
 * The peer multiples: for every category, the median mcap/tvl of its tokenized protocols that
 * carry a market cap, when at least `peer_min_peers` of them do; the global median otherwise.
 * Both are clamped to [peer_floor, peer_cap] so one outlier cannot price a whole category.
 */
export function peerMultiples(snapshot: Snapshot, model: ModelConstants = MODEL): { byCategory: Map<string, PeerMultiple>; global: number } {
  // A market cap of zero is no price: only protocols that actually carry a market cap price a category.
  const priced = snapshot.protocols.filter((p) => !isPreToken(p) && p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
  const globalRaw = median(priced.map((p) => p.mcap_usd! / p.tvl_usd), 0.25);
  const global = clamp(globalRaw, model.peer_floor, model.peer_cap);
  const byCategory = new Map<string, PeerMultiple>();
  const categories = new Set(snapshot.protocols.map((p) => p.category ?? 'Other'));
  for (const category of categories) {
    const peers = priced.filter((p) => (p.category ?? 'Other') === category);
    if (peers.length >= model.peer_min_peers) {
      byCategory.set(category, { category, peers: peers.length, multiple: clamp(median(peers.map((p) => p.mcap_usd! / p.tvl_usd), global), model.peer_floor, model.peer_cap), fallback: false });
    } else {
      byCategory.set(category, { category, peers: peers.length, multiple: global, fallback: true });
    }
  }
  return { byCategory, global };
}

/** The peer multiple one protocol is priced at, and how many peers set it. */
export function peerMultipleFor(p: SnapshotProtocol, peers: { byCategory: Map<string, PeerMultiple>; global: number }): { multiple: number; count: number; fallback: boolean } {
  const entry = peers.byCategory.get(p.category ?? 'Other');
  if (entry === undefined) return { multiple: peers.global, count: 0, fallback: true };
  return { multiple: entry.multiple, count: entry.peers, fallback: entry.fallback };
}

/** The multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  peers: { byCategory: Map<string, PeerMultiple>; global: number },
  model: ModelConstants = MODEL,
): {
  implied: number;
  peerMultiple: number;
  peerCount: number;
  peerFallback: boolean;
  growthPct: number;
  growthMult: number;
  maturityMult: number;
  breadthMult: number;
  classFactor: number;
  age: number | null;
} {
  const age = ageDays(asOf, protocol.listed_at);
  const { multiple, count, fallback } = peerMultipleFor(protocol, peers);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = clamp(rawGrowth, model.growth_floor, model.growth_cap);
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (clamp(ageForModel, 0, model.maturity_days) / model.maturity_days) * model.maturity_range;
  const breadthMult = 1 + Math.min(Math.max(protocol.chains.length - 1, 0), model.breadth_max_extra) * model.breadth_step;
  const cls = launchClass(protocol);
  const classFactor = cls === 'candidate' ? 1 : model.repackaged_factor;
  const implied = Math.max(1, Math.round(protocol.tvl_usd * multiple * growthMult * maturityMult * breadthMult * classFactor));
  return { implied, peerMultiple: multiple, peerCount: count, peerFallback: fallback, growthPct, growthMult, maturityMult, breadthMult, classFactor, age };
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** Gas for one transaction on a chain: mainnet costs more than a rollup or an L1. */
function gasFor(chain: string): number {
  return chain === 'Ethereum' ? 8 : 2;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open, so the loan book records your address.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open through at least one fee cycle.`;
  if (c.includes('bridge') || c.includes('cross chain')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app, so the route records your address.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} on ${chain} and keep the receipt token in the same wallet.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('basis trading')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedged position, then close it after a day.`;
  if (c.includes('prediction')) return `Fund $${capital} on ${name} and place one market position on ${chain}, then settle it when the market resolves.`;
  if (c.includes('curator') || c.includes('allocator') || c.includes('risk')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the vault shares, so the allocation records your address.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain} and hold it in the same wallet.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield-bearing asset on ${chain} through ${name} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active for the full term.`;
  if (c.includes('index')) return `Buy $${capital} of the ${name} index on ${chain} and hold the index token.`;
  if (c.includes('chain')) return `Bridge $${capital} of USDC into the ${name} chain and use one of its apps, so the chain records your address.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** A second chain's action, when the protocol runs on more than one chain. */
function secondChainAction(p: SnapshotProtocol, capital: number): string | null {
  if (p.chains.length < 2) return null;
  const chain = p.chains[1]!;
  return `Repeat the same position on ${chain} with $${Math.max(25, Math.round(capital / 2))} so the protocol records activity on two chains, not one.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age), never from a hand-written list.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const gas = gasFor(chain);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  const second = secondChainAction(p, capital);
  const weekly: FarmStep = second === null
    ? { text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`, cost: `about $${gas} of gas a week`, time: '10 minutes a week' }
    : { text: second, cost: `about $${gas} of gas`, time: '15 minutes' };
  return [
    { text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`, cost: `under $${gas} of gas for the first transaction`, time: '5 minutes' },
    { text: action, cost: `$${capital} of capital and about $${gas} of gas`, time: '15 minutes to set up' },
    weekly,
    { text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`, cost: `the $${capital} stays in the position`, time: `${hold} days` },
    { text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`, cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
    { text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`, cost: 'nothing but the log', time: '5 minutes' },
  ];
}

/** What one farm plan costs in all: the capital plus four weeks of gas and the setup gas. */
export function farmCost(p: SnapshotProtocol): number {
  const gas = gasFor(chainOf(p));
  return capitalFor(p) + gas * 6;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks: every pre-token protocol, strongest implied value first. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const peers = peerMultiples(snapshot, model);
  const scored = snapshot.protocols
    .filter(isPreToken)
    .map((p) => {
      const v = impliedValue(p, snapshot.as_of, peers, model);
      return { p, v };
    });
  scored.sort((a, b) => b.v.implied - a.v.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    listed_at: s.p.listed_at,
    age_days: s.v.age,
    token_status: 'pre-token',
    launch_class: launchClass(s.p),
    implied_value_usd: s.v.implied,
    farm_cost_usd: farmCost(s.p),
    // Full precision, never rounded: the dashboard recomputes this row from these exact
    // figures, and a rounded multiplier would make its check disagree with board.json.
    model: {
      peer_multiple: s.v.peerMultiple,
      peer_category: s.p.category ?? 'Other',
      peer_count: s.v.peerCount,
      growth_pct: s.v.growthPct,
      growth_multiplier: s.v.growthMult,
      maturity_multiplier: s.v.maturityMult,
      breadth_multiplier: s.v.breadthMult,
      class_factor: s.v.classFactor,
      age_days: s.v.age,
    },
    farm_steps: farmSteps(s.p, s.v.age).map(stepText),
  }));
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/**
 * The tokenized peers one row is priced against: its category's largest by market cap.
 * Only peers whose own multiple sits in a plausible band (0.02x to 5x) are shown: a
 * protocol with a $6M TVL and a $2.6B market cap is a data quirk, not a comparable, and
 * showing it next to the median it did not set would mislead the reader.
 */
export function peersFor(p: SnapshotProtocol, snapshot: Snapshot): PeerRow[] {
  const priced = (q: SnapshotProtocol): boolean =>
    !isPreToken(q) && q.mcap_usd !== null && q.mcap_usd > 0 && q.tvl_usd > 0 &&
    q.mcap_usd / q.tvl_usd >= 0.02 && q.mcap_usd / q.tvl_usd <= 5;
  const same = snapshot.protocols
    .filter((q) => priced(q) && (q.category ?? 'Other') === (p.category ?? 'Other'))
    .sort((a, b) => b.mcap_usd! - a.mcap_usd!);
  const pool = same.length >= PEER_ROWS ? same : snapshot.protocols
    .filter(priced)
    .sort((a, b) => b.mcap_usd! - a.mcap_usd!);
  return pool.slice(0, PEER_ROWS).map((q) => ({
    slug: q.slug,
    name: q.name,
    tvl_usd: q.tvl_usd,
    mcap_usd: q.mcap_usd!,
    multiple: round4(q.mcap_usd! / q.tvl_usd),
  }));
}

/** A board row's compact form for data.js, with its farm plan and its peers. */
export function radarRow(row: BoardRow, snapshot: Snapshot): RadarRow {
  const p = snapshot.protocols.find((q) => q.slug === row.slug)!;
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    listed_at: row.listed_at,
    age_days: row.age_days,
    launch_class: row.launch_class,
    implied_value_usd: row.implied_value_usd,
    farm_cost_usd: row.farm_cost_usd,
    peer_multiple: row.model.peer_multiple,
    peer_category: row.model.peer_category,
    peer_count: row.model.peer_count,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    breadth_multiplier: row.model.breadth_multiplier,
    class_factor: row.model.class_factor,
    farm_steps: row.farm_steps,
    peers: peersFor(p, snapshot),
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const peers = peerMultiples(snapshot, model);
  const watchlistSet = new Set(snapshot.watchlist);
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist: [...snapshot.watchlist].sort(),
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    watchlist_implied_usd: board.filter((r) => watchlistSet.has(r.slug)).reduce((n, r) => n + r.implied_value_usd, 0),
    total_implied_usd: board.reduce((n, r) => n + r.implied_value_usd, 0),
    pretoken_tvl_usd: snapshot.protocols.filter(isPreToken).reduce((n, p) => n + p.tvl_usd, 0),
    rows: board.map((r) => radarRow(r, snapshot)),
    live,
    peer_multiples: [...peers.byCategory.values()].sort((a, b) => (a.category < b.category ? -1 : a.category > b.category ? 1 : 0)),
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.trim().length < 20 || s.trim().length > 600) return `${r.slug} has a farm step of ${s.trim().length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
    if (r.implied_value_usd > 1e14) return `${r.slug} has implied value over the cap`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
