import {
  BarChart,
  Callout,
  Card,
  CardBody,
  CardHeader,
  CollapsibleSection,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Stack,
  Table,
  Text,
  useCanvasState,
  useHostTheme,
} from "cursor/canvas";

type Tier = "Foundation" | "Core" | "Advanced";

type Tool = {
  name: string;
  tier: Tier;
  one: string;
  why: string;
  inputs: string;
  output: string;
  math?: string;
  trap?: string;
};

type Layer = {
  id: string;
  title: string;
  blurb: string;
  tools: Tool[];
};

const LAYERS: Layer[] = [
  {
    id: "substrate",
    title: "1. Data substrate",
    blurb:
      "Everything else in this document is a query against these tables. If you build only this layer and nothing else, you can still answer most questions with SQL. If you skip it and call ESI live per page load, you permanently cap yourself at what the in-game market window already shows.",
    tools: [
      {
        name: "Order-book snapshotter and differ",
        tier: "Foundation",
        one: "Poll the regional order book every five minutes and persist the diff between consecutive polls, not the snapshot.",
        why: "This is the keystone. ESI gives you a live book and a daily summary, with nothing in between. Diffing consecutive books reconstructs the middle: when each order appeared, every price change it made, how much volume drained out of it, and when it vanished. Almost every genuinely useful metric further down this page is derived from this one table, and none of them can be computed after the fact — if you did not record it at the time, that information is gone forever.",
        inputs:
          "`GET /markets/{region_id}/orders/` paged via `X-Pages`, plus `GET /markets/structures/{structure_id}/` for each citadel you have docking rights in.",
        output:
          "An order-lifecycle table keyed by `order_id`: first seen, last seen, every price change with timestamp, volume_remain at each observation, and a terminal state of filled / cancelled / expired.",
        math:
          "Between two polls, an order whose `volume_remain` dropped by n contributed n units of traded volume on its own side of the book. An order that disappeared while `volume_remain > 0` either expired or was cancelled — use `issued + duration` to tell which.",
        trap:
          "An order that vanishes is ambiguous between 'fully filled' and 'cancelled'. Do not silently count disappearances as trades; carry an explicit `ambiguous` state, because conflating the two is what makes naive volume estimates wrong on illiquid items.",
      },
      {
        name: "Daily market-history warehouse",
        tier: "Foundation",
        one: "Mirror `GET /markets/{region_id}/history/` into your own table, per type per region, and never delete rows.",
        why: "ESI serves history from the start of the previous calendar year and no further. Your own copy accumulates indefinitely, which is what lets you ask multi-year seasonality questions later. It is also dirt cheap: one request per type per region per day, and the route only refreshes once daily at 11:05.",
        inputs: "One request per (region, type) pair per day. Backfill once, then append.",
        output:
          "Daily rows of `date, region_id, type_id, average, highest, lowest, order_count, volume`.",
        trap:
          "`highest` and `lowest` are executed trade prices for the day, not order-book quotes, and `order_count` is trades executed, not open orders. CCP does not document whether `average` is volume-weighted, so do not treat `average × volume` as exact ISK turnover. History is also region-wide — for The Forge that is a fine proxy for Jita, but for a region with several active stations it is not.",
      },
      {
        name: "Quote and depth time series",
        tier: "Foundation",
        one: "Roll each book snapshot into one compact row per (type, location, 5-minute bucket).",
        why: "The raw diff table is for forensics; this is the table your charts and scanners actually read. Collapsing a 400,000-row book into a few thousand quote rows per interval is the difference between a scan that returns in milliseconds and one that times out.",
        inputs: "Each order-book poll, grouped by type and location.",
        output:
          "`best_bid, best_ask, bid_depth_1pct, ask_depth_1pct, bid_depth_5pct, ask_depth_5pct, bid_order_count, sell_order_count, spread_abs, spread_pct`, plus hourly and daily rollups.",
        math:
          "Depth at k% means the cumulative units available within k% of the best price on that side. This is what tells you whether a quoted spread is real or is one unit deep and therefore a mirage.",
      },
      {
        name: "Inferred trade ledger (buy-side vs sell-side split)",
        tier: "Foundation",
        one: "From book diffs, attribute every unit of traded volume to either 'sold into a buy order' or 'bought from a sell order'.",
        why: "This is the single most valuable dataset you can own, because ESI deliberately never provides it. Daily history gives you one blended volume number. The split is what separates a real station-trading opportunity from a trap: an item where 95% of volume is people buying from sell orders will never fill your buy order, no matter how good the quoted spread looks.",
        inputs: "The order-lifecycle table.",
        output: "Per type, location, and day: `buy_side_units, sell_side_units, balance_ratio`.",
        math:
          "balance_ratio = buy_side_units / total_units. Values near 0.5 indicate an item that genuinely changes hands in both directions, which is the precondition for market making.",
        trap:
          "Five-minute polling undercounts fast markets, where an order can be created and fully consumed between polls. Treat this as a lower bound and calibrate it against the daily `volume` field, which is ground truth for the total.",
      },
      {
        name: "Static data service",
        tier: "Foundation",
        one: "Load the SDE and expose types, packaged volume, the market group tree, meta groups, and the region/system/station graph.",
        why: "Packaged volume in m³ gates every hauling calculation. The market group tree is how a human actually navigates 15,000 items — 'scan only Ships and Modules' is the first filter anyone reaches for. Meta groups let you compare an item against its tech-2 and faction siblings.",
        inputs: "SDE YAML, reloaded on each expansion.",
        output: "Indexed lookups for type metadata, group hierarchy, and spatial topology.",
        trap:
          "Type IDs get reused and renamed across expansions, and items get added to or removed from the market. Re-import on every patch and diff the result, or your saved watchlists will silently rot.",
      },
      {
        name: "Location registry with per-location fee rates",
        tier: "Foundation",
        one: "One table of every station and structure you trade in, carrying its actual broker fee and sales tax.",
        why: "Fee rates are not a global constant, and treating them as one is the most common source of wrong margins. An NPC station's broker fee depends on your skills and your standings with that specific corporation and faction. An Upwell structure ignores Broker Relations entirely and charges whatever the owner set. The same trade can be profitable in one and a loss in the other.",
        inputs:
          "SDE stations, `GET /universe/structures/`, and manually recorded owner fee rates for structures you use.",
        output: "`location_id → { broker_rate, tax_rate, is_npc, owner_fee, docking_ok }`.",
        trap:
          "Structure owner fees can change without notice and there is no ESI endpoint that exposes them. Reconcile periodically against the broker fees actually charged in your wallet journal.",
      },
      {
        name: "Character context service",
        tier: "Foundation",
        one: "Per character: trade skill levels, raw standings, order slot count, wallet balance, and current orders.",
        why: "Every profitability number downstream is a function of your real fee rates, and every capital number is a function of your real slots and balance. Tools that assume max skills tell you about a character you may not have. Order slots in particular are a hard scarce resource — 305 at full training — and they are the actual binding constraint on a mature trading operation, not ISK.",
        inputs:
          "Character skills, standings, `GET /characters/{id}/orders/`, wallet balance.",
        output: "A context object every calculator takes as a parameter.",
        trap:
          "Broker fees use *unmodified* standings. Connections and Diplomacy raise your effective standing but do nothing for fees, so read the raw value.",
      },
    ],
  },
  {
    id: "fees",
    title: "2. Fee and profitability engine",
    blurb:
      "A small, boring, heavily-tested module that every scanner and every UI number routes through. Getting this wrong does not produce an obvious bug — it produces plausible-looking numbers that are quietly off by a few percent, which is the entire margin on most station trades.",
    tools: [
      {
        name: "Fee resolver",
        tier: "Foundation",
        one: "One function: (character, location) → broker rate, sales tax rate, relist discount.",
        why: "Single source of truth. Every other tool calls this rather than embedding its own copy of the constants, so when CCP next changes the tax rate you edit one file.",
        inputs: "Character context plus location registry.",
        output: "Three rates plus the 100 ISK minimum fee floor.",
        math:
          "NPC broker = 3% − 0.3%×BrokerRelations − 0.03%×factionStanding − 0.02%×corpStanding, floored at 1%. Structure broker = 0.5% SCC + owner%, with skills having no effect. Sales tax = 7.5% × (1 − 0.11×Accounting), so 3.375% at Accounting V.",
      },
      {
        name: "Round-trip profitability calculator",
        tier: "Core",
        one: "For any (type, location, character): net margin, ISK per unit, ROI, breakeven sell price, and capital required.",
        why: "The number every screen displays. Expose it as one pure function so the scanner, the item page, and the order monitor cannot disagree with each other.",
        inputs: "Best bid, best ask, resolved fee rates.",
        output: "Net margin and the derived quantities.",
        math:
          "A buy-order-to-sell-order round trip is profitable when ask/bid > (1 + b) / (1 − t − b), where b is broker rate and t is sales tax. At max skills in an NPC station that threshold is roughly 1.053, so a quoted spread under about 5.3% is a loss before you have relisted even once.",
      },
      {
        name: "Relist cost and undercut budget model",
        tier: "Core",
        one: "Compute what an undercutting war actually costs, and how many relists a trade can absorb before it goes negative.",
        why: "This is the piece essentially no public tool models, and it is where real station-trading profit quietly disappears. The relist charge is assessed on the *entire remaining order value*, not on the price delta, so it recurs every single time you reprice. A trade showing 8% gross margin that needs twenty relists to fill is not an 8% trade.",
        inputs: "Order value, fee rates, Advanced Broker Relations level, expected relist count.",
        output: "ISK per relist, and a maximum sustainable relist count for a target return.",
        math:
          "Relist fee = (1 − (50% + 6%×AdvBrokerRelations)) × brokerRate × newOrderValue + brokerRate × max(newValue − oldValue, 0), minimum 100 ISK. At Advanced Broker Relations V the discount reaches 80%, leaving 20% of the broker rate charged on full order value per reprice.",
        trap:
          "Sometimes cancelling and creating a fresh order is cheaper than modifying an existing one, particularly when raising a price substantially. Compute both paths and recommend the cheaper.",
      },
      {
        name: "Depth-aware execution pricer",
        tier: "Core",
        one: "Walk the book to answer 'if I buy or sell n units right now, what is my volume-weighted price?'",
        why: "Best bid and best ask are frequently one unit deep. Any scanner that ranks on top-of-book price is ranking on a number you cannot actually transact at. Walking the book converts a theoretical spread into an executable one, and this single change eliminates most false positives.",
        inputs: "Full order book for the type at the location, plus a target quantity.",
        output: "VWAP, worst fill price, units actually available, and slippage against top-of-book.",
        trap:
          "Buy orders have a range and a minimum volume. An order listed in the region is only matchable if the seller's station is within that range, and a min-volume order will not fill a single-unit sale. Filter on both before counting an order as real liquidity.",
      },
    ],
  },
  {
    id: "scanners",
    title: "3. Opportunity scanners",
    blurb:
      "The part you will use daily. The hard problem is not finding wide spreads — those are trivially easy to list and are overwhelmingly traps. The hard problem is the filter stack that removes them. Design each of these as a composable predicate over the substrate rather than a bespoke query.",
    tools: [
      {
        name: "Liquidity classifier",
        tier: "Core",
        one: "A reusable, parameterized predicate that every other scanner composes in as its first stage.",
        why: "Build this once as a framework rather than re-implementing thresholds in each scanner. Different strategies need different liquidity definitions — market making wants many small trades daily, speculation tolerates thin but trending markets — so make the predicate pluggable rather than fixed.",
        inputs: "Daily history over a configurable window.",
        output: "A boolean plus the component scores that produced it, so you can see *why* something was excluded.",
        math:
          "A reasonable default: traded on at least 70% of days in the window, at least 100 trades per day, and average daily ISK volume above a floor you set by capital size. Dividing `order_count` by `volume` also gives you average trade size, a cheap proxy for whether an item is retail flow you can intermediate or a few bulk transfers you cannot.",
      },
      {
        name: "Station-trading scanner",
        tier: "Core",
        one: "The primary screen: rank every liquid item at one station by realistic net ISK per day.",
        why: "This is the product. Everything upstream exists to make this ranking trustworthy. The ranking metric should be expected net profit per day after all fees and after an assumed capture rate, not margin percentage — a 40% margin on an item that trades twice a week is worth less than 6% on something that moves constantly.",
        inputs: "Quote series, inferred trade ledger, fee engine, character context.",
        output:
          "Ranked table with net margin, ISK/day, capital required, competition level, volume balance, and days-traded.",
        math:
          "expected_daily_profit = net_margin_per_unit × daily_volume × capture_rate, where capture_rate is your realistic share of flow given competition — typically a small single-digit percentage in a contested hub.",
        trap:
          "Rank on net ISK per day *per order slot*, not raw ISK per day, once you are slot-constrained. That reordering changes the top of the list substantially.",
      },
      {
        name: "Competition meter and relist cadence estimator",
        tier: "Core",
        one: "Estimate how many traders are actively working an item, and therefore how often you must reprice to stay on top of book.",
        why: "Competition is the variable that decides whether an opportunity fits your play style. An item needing a reprice every fifteen minutes is unusable if you check in twice a day, regardless of its margin. Surfacing this up front stops you from entering markets you cannot service.",
        inputs: "Order-lifecycle table.",
        output:
          "Distinct orders changing price per interval, a time-of-day activity heatmap, and a recommended reprice cadence.",
        math:
          "Count distinct `order_id`s whose price changed within each resampling interval. Because a single trader can run several orders, this is an upper bound on participant count — but the trend and the relative comparison across items are what matter.",
        trap:
          "There is a daily downtime gap around 11:00–11:30 UTC where every market goes quiet. Exclude it or it will distort your cadence estimates and your time-of-day heatmaps.",
      },
      {
        name: "Volume-balance screen",
        tier: "Core",
        one: "Filter and sort by the buy-side versus sell-side volume split from the inferred trade ledger.",
        why: "The highest-signal filter you can apply, and one no ESI-only tool can replicate. Market making needs both sides flowing. A heavy sell-side skew means people buy this item but nobody sells it to buy orders, so your buy order sits unfilled while the spread taunts you.",
        inputs: "Inferred trade ledger.",
        output: "balance_ratio per item with a configurable acceptance band.",
      },
      {
        name: "Spike and manipulation detector",
        tier: "Core",
        one: "Flag items whose current quotes are anomalous against their own recent history.",
        why: "The classic trap is an item whose 'cheap' buy price is cheap because someone spiked the market an hour ago, or whose enormous spread exists because a manipulator bought out the sell side. Both look spectacular in a naive margin scan.",
        inputs: "Quote series plus daily history.",
        output: "Flags with the specific reason attached, rather than a silent exclusion.",
        math:
          "Compare current bid against the 7-day high and current ask against the 30-day average; flag z-scores beyond a threshold. A sudden collapse in sell-side order count alongside a price jump is the signature of a buyout.",
      },
      {
        name: "Cross-region hauling scanner",
        tier: "Core",
        one: "Find profitable buy-here sell-there routes, constrained by cargo volume, jumps, and security.",
        why: "The natural complement to station trading, and it uses the same substrate. The constraint that makes it real is m³ per ISK of profit — a trade with a wonderful margin that fills a freighter for 20M ISK of profit is not worth the trip or the gank risk.",
        inputs: "Quote series across regions, SDE volumes, route graph.",
        output:
          "Routes with profit per m³, profit per jump, total capital, and depth-limited quantity.",
        trap:
          "Use depth-aware pricing on both ends. A route that looks profitable on best-bid-to-best-ask usually evaporates once you price the actual quantity a hauler carries.",
      },
      {
        name: "Buyout and relisting scanner",
        tier: "Advanced",
        one: "Compute the cost to buy out the sell side up to a target price, and whether reselling at that price clears fees.",
        why: "An aggressive variant worth modeling explicitly because the arithmetic is unintuitive and the failure mode is expensive — you end up holding inventory that competitors undercut below your cost.",
        inputs: "Full sell-side book, fee rates, target return.",
        output: "Units to buy, total cost, required resale price, and units-to-sell versus daily sell-side volume.",
        math:
          "Buying at market incurs no broker fee, so to hit return r you must resell at p×(1+r) / (1 − r×(t+b) − t − b).",
        trap:
          "Always compare units you would need to sell against the item's average daily sell-side volume. If you need to move three days of volume, you will be undercut long before you clear.",
      },
      {
        name: "Substitute and cohort view",
        tier: "Advanced",
        one: "Show an item alongside its meta-group siblings and market-group peers.",
        why: "Demand migrates between substitutes. When a tech-2 module's price spikes, the meta-4 equivalent absorbs the demand. Seeing the cohort together catches moves before they show in the item's own history.",
        inputs: "SDE meta groups and market group tree, plus quote series.",
        output: "Side-by-side price and volume across the cohort.",
      },
      {
        name: "Build-versus-buy crossover scanner",
        tier: "Advanced",
        one: "For anything manufacturable, compare market price against input cost plus job fees.",
        why: "You already have industry data in scope, and the two domains inform each other. When market price drops below build cost, producers exit and supply contracts, which is a genuinely predictive signal for a price floor.",
        inputs: "Blueprint materials, system cost indices, quote series.",
        output: "Margin of build over buy, with the crossover date.",
      },
    ],
  },
  {
    id: "forecast",
    title: "4. Forecasting and prediction",
    blurb:
      "Set expectations honestly here. EVE prices are driven by patch notes, wars, and nullsec politics — exogenous events no time-series model sees coming. The forecasting that genuinely pays is not price prediction; it is predicting *volume*, *fill probability*, and *whether a margin will survive*. Those are far more tractable and far more actionable.",
    tools: [
      {
        name: "Volume and price baseline forecaster",
        tier: "Advanced",
        one: "Simple statistical baselines with honest prediction intervals, not a neural network.",
        why: "EVE volume has extremely strong weekly seasonality — weekends materially outperform weekdays — so a seasonal-naive baseline is hard to beat and trivially explainable. Start there and only add complexity if it measurably wins against that baseline on held-out data.",
        inputs: "Daily history warehouse.",
        output: "Point forecast plus an interval, with backtested error metrics displayed next to it.",
        trap:
          "Always show the prediction interval. A point forecast presented without uncertainty invites you to size positions as though the number were certain.",
      },
      {
        name: "Fill-probability and time-to-fill model",
        tier: "Advanced",
        one: "Given your price, queue position, competition, and the item's flow, estimate P(filled within h hours).",
        why: "This is the prediction that actually changes decisions, and it is the one nobody builds. Capital tied up in an order that will not fill for a week has a real opportunity cost that no margin figure captures. Converting margin into expected ISK per hour of deployed capital is the correct ranking metric, and it requires this model.",
        inputs: "Inferred trade ledger, competition meter, your order's price and queue depth.",
        output: "A fill-probability curve over time, and expected ISK per hour of capital.",
        math:
          "Fit arrival intensity per side from the trade ledger, then model your fill as a queueing problem where orders ahead of you in price consume arriving flow first.",
      },
      {
        name: "Margin-persistence model",
        tier: "Advanced",
        one: "Backtest, per item, what fraction of days over the last 90 the round trip was actually profitable.",
        why: "A margin observed at one instant is a sample of one. An item profitable on 85 of the last 90 days is a business; one profitable on 12 of 90 is noise you happened to catch. This converts a point-in-time scan into a claim about reliability, and it is cheap to compute once you have the quote series.",
        inputs: "Historical quote series plus fee engine.",
        output: "Percentage of days profitable, plus the distribution of the spread over time.",
      },
      {
        name: "Regime and cycle detector",
        tier: "Advanced",
        one: "Detect the recurring margin-compression cycle: wide spread attracts traders, competition compresses it, traders leave, spread widens again.",
        why: "This pattern is well documented in EVE trading practice and is visible in competition and spread data once you store both. Knowing where in the cycle an item sits tells you whether to enter now or wait.",
        inputs: "Spread history and competition history.",
        output: "A current-phase label per item with the historical cycle period.",
      },
      {
        name: "Patch-note and event watchlist",
        tier: "Advanced",
        one: "Ingest patch notes and dev blogs, extract mentioned item and ship names, map them to type IDs, and alert on your watchlist.",
        why: "The most reliably profitable speculation in EVE comes from knowing a balance change before the market reprices. This is a genuine information edge available to a tool and unavailable to someone staring at the market window, and text-to-type-ID mapping is a solved problem once you have the SDE loaded.",
        inputs: "Patch notes and dev blog feeds, SDE type names.",
        output: "Alerts linking a change to affected types and their current market state.",
      },
    ],
  },
  {
    id: "capital",
    title: "5. Capital, portfolio and risk",
    blurb:
      "You asked specifically about how much to invest in trades. That question has no answer without this layer, because position sizing depends on order slots, escrow, per-item flow capacity, and concentration — not just on which trade looks best.",
    tools: [
      {
        name: "Position sizer",
        tier: "Core",
        one: "Recommend ISK per trade subject to capital, slots, per-item daily volume, and concentration limits.",
        why: "The direct answer to 'how much should I put into this'. The binding constraint is usually not your wallet — it is that an item only trades so many units a day, so capital beyond your realistic share of that flow simply sits idle in an unfilled order.",
        inputs: "Wallet balance, slot count, per-item volume and capture rate, fill-probability model.",
        output: "Recommended ISK and unit count per opportunity, with the binding constraint named.",
        math:
          "Cap position at capture_rate × daily_volume × price. Fund with (n×p) × (1 + b×(2+r)) to cover both the buy-side broker fee and the eventual sell-side fee, plus a buffer for repricing.",
        trap:
          "Margin Trading no longer exists — it became Advanced Broker Relations in 2020 and buy orders now require 100% escrow. Any sizing model carried over from an older guide that assumes partial escrow will overcommit you badly.",
      },
      {
        name: "Order-slot optimizer",
        tier: "Core",
        one: "Treat slots as the scarce resource and solve for the allocation maximizing total ISK per day.",
        why: "Once you are running near your slot cap, the relevant question stops being 'is this trade good' and becomes 'is this trade better than the worst trade currently occupying a slot'. That is a knapsack problem, and solving it explicitly is worth real money.",
        inputs: "Ranked opportunities with expected ISK/day, current orders, slot cap.",
        output: "Suggested additions and evictions.",
      },
      {
        name: "FIFO inventory and cost basis",
        tier: "Core",
        one: "Track per-item stock with a FIFO cost basis and stock age.",
        why: "Without cost basis you cannot compute real profit, only gross revenue. FIFO matches how you actually consume inventory, and stock age surfaces dead capital — items bought weeks ago that never sold are the silent drain on a trading operation.",
        inputs: "Wallet transactions plus current assets.",
        output: "Per-item quantity, weighted cost, unrealized P&L, and age buckets.",
        trap:
          "A volume-weighted average over an arbitrary date window silently distorts whenever inventory crosses the window boundary, which is most of the time. Match lots, do not average.",
      },
      {
        name: "Realized P&L engine",
        tier: "Core",
        one: "Match sells against buys FIFO and allocate broker fees and sales tax to the correct trade.",
        why: "The scoreboard. It is also the only way to discover that a trade you believed was profitable was not, once relist fees are properly attributed. Fee allocation is the part people skip and it is exactly where the error lives.",
        inputs: "Wallet transactions and wallet journal, keyed by `journal_ref_id`.",
        output: "Realized P&L by item, character, location, and day.",
        trap:
          "Broker fees appear in the journal but are not linked to a transaction, because they are charged at order creation and the order may never fill. Attribute them to the order, then to the trade only on fill, and carry fees on unfilled orders as a separate sunk cost line.",
      },
      {
        name: "Exposure and risk dashboard",
        tier: "Advanced",
        one: "Show capital deployed versus idle, escrow committed, concentration by item and group, and aging inventory.",
        why: "Catches the failure modes that do not show up in per-trade numbers: over-concentration in one item or one market group, and inventory quietly aging into a loss.",
        inputs: "Orders, inventory, wallet.",
        output: "Concentration breakdown and a stale-inventory list.",
      },
    ],
  },
  {
    id: "workflow",
    title: "6. Live trading workflow",
    blurb:
      "Analysis finds trades; this layer is where the hours actually go. The goal is to compress the repetitive daily loop — check orders, spot undercuts, decide, reprice — into the smallest possible number of decisions, each pre-computed.",
    tools: [
      {
        name: "Order monitor and undercut alerts",
        tier: "Core",
        one: "Continuously compare your open orders against the live book and flag every one you have been beaten on.",
        why: "The most-used screen in any serious trading tool. The value is not the alert itself but attaching the economics to it, so 'you have been undercut' arrives together with what responding would cost and whether it is still worth it.",
        inputs: "Your character orders plus the live book.",
        output: "Per-order status with rank in book, distance from top, and margin at current top of book.",
      },
      {
        name: "Relist decision engine",
        tier: "Core",
        one: "For each beaten order, recommend reprice, hold, cancel-and-recreate, or abandon — with the ISK behind each.",
        why: "This is the automation that matters. The decision is genuinely non-obvious: repricing costs a recurring fee on full order value, recreating sometimes costs less than modifying, and sometimes the right move is to hold because the undercutter is one unit deep and will clear on its own. Pre-computing this turns an hour of judgement calls into a list you execute.",
        inputs: "Relist cost model, depth-aware pricer, fill-probability model.",
        output: "A recommended action per order with expected value and the reasoning shown.",
        trap:
          "Orders can only be modified once every five minutes. The engine must track each order's cooldown, or it will recommend actions you cannot take.",
      },
      {
        name: "Daily worklist",
        tier: "Core",
        one: "One ordered queue of today's actions, with in-game-pasteable strings.",
        why: "Reduces the whole operation to working down a list. Generating multibuy strings and quickbar-importable item lists removes the retyping that makes the daily loop tedious, which is the actual reason people abandon station trading.",
        inputs: "Relist decisions plus new opportunities plus expiring orders.",
        output: "A prioritized action list with copy-paste payloads.",
      },
      {
        name: "Order layering planner",
        tier: "Advanced",
        one: "Split a position across k orders so you always hold one off cooldown.",
        why: "A direct exploit of the five-minute modify timer. With a single order, a competitor who undercuts you thirty seconds after your reprice leaves you stranded for four and a half minutes. Holding several staggered orders means you always have one available to reprice.",
        inputs: "Competition meter output and desired position size.",
        output: "Recommended order count and size split.",
        math:
          "Maintain at least as many orders as you have active competitors, plus one spare that is always repriceable.",
      },
    ],
  },
  {
    id: "research",
    title: "7. Research and validation",
    blurb:
      "The layer that keeps the rest honest. Without it you have no way to distinguish a scanner that finds money from one that finds plausible-looking numbers, and you will keep trusting it either way.",
    tools: [
      {
        name: "Order-book replay backtester",
        tier: "Advanced",
        one: "Replay stored book snapshots, place simulated orders, and model fills against the real historical flow.",
        why: "The only way to evaluate a strategy before risking ISK, and the payoff for having stored diffs from day one. Every parameter in every scanner — margin thresholds, competition limits, capture rates — is a guess until you can test it against recorded history.",
        inputs: "The order-lifecycle table over a historical window.",
        output: "Simulated P&L, fill rates, and capital utilization per strategy configuration.",
        trap:
          "Your simulated orders would have changed competitor behavior, and a non-adversarial simulator will not capture that. Backtested returns are an optimistic ceiling, not a forecast — treat them as ranking tools between strategies rather than as absolute predictions.",
      },
      {
        name: "Recommendation scorecard",
        tier: "Advanced",
        one: "Record every scan recommendation, then reconcile it against what your wallet actually did.",
        why: "Closes the loop, and is the highest-leverage thing you can build for long-run quality. It answers the question that actually matters — is this tool making me money — and turns filter thresholds from guesses into tuned parameters.",
        inputs: "Logged recommendations plus realized P&L.",
        output: "Hit rate, realized versus predicted margin, and per-filter contribution.",
      },
      {
        name: "Item deep-dive workbench",
        tier: "Core",
        one: "One page with everything known about a single item, reachable from every table in the app.",
        why: "Scanners narrow to a shortlist; this is where the actual decision gets made. It should include the candlestick and volume history, a live depth chart, spread over time, competition over time, your current position and orders, and your realized P&L on it to date — so the judgement call happens in one place with full context.",
        inputs: "Every table in the substrate.",
        output: "A single composed view per (type, location).",
        trap:
          "Candlestick and market-depth rendering are not covered by general-purpose chart libraries. Plan on a financial charting library or hand-rolled SVG for these two specifically.",
      },
    ],
  },
];

const TIERS: Array<Tier | "All"> = ["All", "Foundation", "Core", "Advanced"];

const CADENCE_ROWS: Array<[string, string, string, string, string]> = [
  [
    "5 min",
    "~120,700",
    "2,514",
    "Everything. Matches the cache, so no data exists that you are missing.",
    "Nothing beyond intra-interval churn, which is unobservable at any cadence.",
  ],
  [
    "10 min",
    "~60,300",
    "1,257",
    "Order lifecycles, per-side volume and reprice detection, all slightly undercounted. Adam4EVE runs its public tracker at exactly this interval.",
    "Roughly half the resolution on fast-moving items. Fine for everything else.",
  ],
  [
    "1 hour",
    "~10,100",
    "838",
    "Spread and depth history, price levels, rough competition trend, order creation and disappearance.",
    "Per-side volume badly undercounted on liquid items. Reprice detection mostly gone.",
  ],
  [
    "Daily",
    "~419",
    "838",
    "A daily snapshot of best bid, best ask, depth and spread. Far better than nothing.",
    "The entire inferred-trade and competition layer. Cannot distinguish a filled order from a cancelled one.",
  ],
];

const SOURCES: Array<[string, string, string]> = [
  [
    "ESI rate limiting",
    "https://developers.eveonline.com/docs/services/esi/rate-limiting/",
    "Token costs, bucket mechanics, error limit.",
  ],
  [
    "Market Orders rate limit, Feb 2026",
    "https://developers.eveonline.com/blog/market-orders-rate-limit-rolls-out-on-february-24-2026",
    "The 12,000-token budget and 1,723 pages across 113 regions.",
  ],
  [
    "CCP: Broker Fee and Sales Tax",
    "https://support.eveonline.com/hc/en-us/articles/203218962-Broker-Fee-and-Sales-Tax",
    "Authoritative broker fee and sales tax formulas.",
  ],
  [
    "EVE University: Trading",
    "https://wiki.eveuniversity.org/Trading",
    "Relist fee formula with worked examples; structure vs NPC differences.",
  ],
  [
    "CCP: Broker Relations",
    "https://www.eveonline.com/news/view/broker-relations",
    "The 2020 change replacing Margin Trading; 100% escrow.",
  ],
  [
    "EVE Market Strategies",
    "https://orbitalenterprises.github.io/eve-market-strategies/index",
    "Quantitative market-making methodology. Fee numbers in it are stale; the method is not.",
  ],
  [
    "EVE forums: downloading all market orders",
    "https://forums.eveonline.com/t/problem-while-downloading-all-market-orders/151641",
    "Source of the 5.9 MB compressed snapshot and 1.7 GB/day figures.",
  ],
  [
    "Virtual Markets, Part Seven",
    "https://poignanttech.com/2024/06/14/virtual-markets-part-seven-populating-our-database/",
    "Source of the 306 KB/page, 112 MB/snapshot and 72 GB/day estimates.",
  ],
  [
    "Adam4EVE API",
    "https://api.adam4eve.eu/",
    "Precedent for 10-minute order-book diffing as a trade-inference tracker.",
  ],
  [
    "Fuzzwork Market Data",
    "https://market.fuzzwork.co.uk/api/",
    "Precomputed region, system and station aggregates as an interim shortcut.",
  ],
];

const FEE_ROWS: Array<[string, string, string]> = [
  [
    "Broker fee, NPC station",
    "3% − 0.3%×BrokerRelations − 0.03%×factionStanding − 0.02%×corpStanding",
    "Floors at 1%. Uses unmodified standings. 100 ISK minimum.",
  ],
  [
    "Broker fee, Upwell structure",
    "0.5% SCC + owner-set %",
    "Broker Relations does not apply at all. Owner % is invisible to ESI.",
  ],
  [
    "Sales tax",
    "7.5% × (1 − 0.11 × Accounting)",
    "3.375% at Accounting V. Base rose from 4% to 7.5% in March 2025.",
  ],
  [
    "Relist fee",
    "(1 − (50% + 6%×AdvBrokerRelations)) × brokerRate × newValue + brokerRate × max(newValue − oldValue, 0)",
    "Charged on full remaining order value every reprice. 80% discount at V. 100 ISK minimum.",
  ],
  [
    "Round-trip breakeven",
    "ask / bid > (1 + b) / (1 − t − b)",
    "About 1.053 at max skills in an NPC station, before any relisting.",
  ],
  [
    "Buy order escrow",
    "100% of order value",
    "Margin Trading was removed in 2020; no partial escrow exists.",
  ],
];

const TRAPS: Array<[string, string]> = [
  [
    "Daily history is region-wide",
    "There is no per-station history endpoint. For The Forge, Jita dominates enough that it is a fair proxy; for most other regions it silently blends several unrelated markets.",
  ],
  [
    "Structure orders are invisible by default",
    "`/markets/{region_id}/orders/` excludes player structures except for ranged orders. Each citadel must be fetched separately with `esi-markets.structure_markets.v1` and docking access, then merged.",
  ],
  [
    "Best price is often one unit deep",
    "Ranking on top-of-book is the single biggest source of false positives. Walk the book for the quantity you actually intend to trade.",
  ],
  [
    "Buy orders have range and minimum volume",
    "A regional buy order only matches sellers within its range, and a min-volume order will not fill small sales. Both fields must be respected before counting an order as liquidity.",
  ],
  [
    "Order modification has a five-minute cooldown",
    "This drives order layering and constrains any automated repricing logic.",
  ],
  [
    "Daily downtime distorts intraday statistics",
    "Roughly 11:00–11:30 UTC every market goes silent. Exclude the window from activity and cadence metrics.",
  ],
  [
    "Character order history only goes back 90 days",
    "Your own long-term record has to be accumulated by you. Start persisting wallet and order data before you need it.",
  ],
  [
    "Most online guides are stale",
    "Broker Relations gives 0.3%/level, not 0.1%. Sales tax base is 7.5%, not 4% or 2%. Margin Trading no longer exists. Guides predating 2025 get all three wrong.",
  ],
];

const PHASES: Array<[string, string, string]> = [
  [
    "Phase 1",
    "Substrate only",
    "Book snapshotter and differ, history warehouse, quote series, SDE service. Ship no UI. Every week you delay is a week of history you can never recover.",
  ],
  [
    "Phase 2",
    "Fee engine and item page",
    "Fee resolver, profitability calculator, depth-aware pricer, item deep-dive workbench. First genuinely useful screen, and it validates that the substrate is correct.",
  ],
  [
    "Phase 3",
    "Scanners",
    "Liquidity classifier, station-trading scanner, competition meter, volume-balance screen, spike detector. By now you have enough stored history for these to be meaningful.",
  ],
  [
    "Phase 4",
    "Workflow and P&L",
    "Order monitor, relist decision engine, FIFO cost basis, realized P&L, daily worklist. This is where the tool starts saving you hours rather than just informing you.",
  ],
  [
    "Phase 5",
    "Prediction and validation",
    "Fill-probability model, margin persistence, backtester, scorecard. Needs several months of accumulated substrate to be worth anything at all.",
  ],
];

function PipelineStage({
  index,
  label,
  detail,
  emphasis,
}: {
  index: number;
  label: string;
  detail: string;
  emphasis?: boolean;
}) {
  const t = useHostTheme();
  return (
    <div
      style={{
        border: `1px solid ${emphasis ? t.accent.primary : t.stroke.tertiary}`,
        borderRadius: 6,
        padding: 12,
        background: emphasis ? t.fill.tertiary : "transparent",
        minWidth: 0,
      }}
    >
      <Text
        size="small"
        tone="tertiary"
        style={{ fontVariantNumeric: "tabular-nums", marginBottom: 2 }}
      >
        {String(index).padStart(2, "0")}
      </Text>
      <Text
        weight="semibold"
        size="small"
        style={{ color: emphasis ? t.accent.primary : t.text.primary }}
      >
        {label}
      </Text>
      <Text size="small" tone="secondary" style={{ marginTop: 4 }}>
        {detail}
      </Text>
    </div>
  );
}

function ToolRow({ tool }: { tool: Tool }) {
  const t = useHostTheme();
  return (
    <CollapsibleSection
      title={tool.name}
      trailing={
        <Text size="small" tone="tertiary">
          {tool.tier}
        </Text>
      }
    >
      <Stack gap={10} style={{ paddingBottom: 8 }}>
        <Text style={{ color: t.text.primary }}>{tool.one}</Text>
        <Text tone="secondary">{tool.why}</Text>
        <Stack gap={4}>
          <Text size="small" tone="tertiary">
            Inputs — {tool.inputs}
          </Text>
          <Text size="small" tone="tertiary">
            Output — {tool.output}
          </Text>
        </Stack>
        {tool.math ? (
          <div
            style={{
              borderLeft: `2px solid ${t.stroke.secondary}`,
              paddingLeft: 10,
            }}
          >
            <Text size="small" tone="secondary">
              {tool.math}
            </Text>
          </div>
        ) : null}
        {tool.trap ? (
          <div
            style={{
              borderLeft: `2px solid ${t.accent.primary}`,
              paddingLeft: 10,
            }}
          >
            <Text size="small" tone="secondary">
              <Text as="span" size="small" weight="semibold">
                Gotcha.{" "}
              </Text>
              {tool.trap}
            </Text>
          </div>
        ) : null}
      </Stack>
    </CollapsibleSection>
  );
}

export default function EveMarketToolBuildPlan() {
  const t = useHostTheme();
  const [tier, setTier] = useCanvasState<Tier | "All">("tierFilter", "All");

  const visibleLayers = LAYERS.map((layer) => ({
    ...layer,
    tools: tier === "All" ? layer.tools : layer.tools.filter((x) => x.tier === tier),
  })).filter((layer) => layer.tools.length > 0);

  const total = LAYERS.reduce((n, l) => n + l.tools.length, 0);
  const shown = visibleLayers.reduce((n, l) => n + l.tools.length, 0);

  return (
    <Stack gap={28} style={{ padding: 28, maxWidth: 1080 }}>
      <Stack gap={8}>
        <H1>EVE market and trading tool — greenfield build plan</H1>
        <Text tone="secondary">
          {total} proposed tools across seven layers, for a station-trading-first market
          analysis and prediction application. Ordered so that each layer only depends on the
          ones above it.
        </Text>
      </Stack>

      <Callout tone="info" title="The decision that determines your ceiling">
        <Text>
          ESI gives you a live order book cached for five minutes, and a once-daily price
          summary. There is nothing in between, and the gap is permanent — you cannot
          backfill it later. If you poll the book every five minutes and persist the{" "}
          <Text as="span" weight="semibold">
            diff
          </Text>{" "}
          between consecutive polls, you reconstruct order lifecycles, per-side traded volume,
          and competitor repricing behaviour, none of which any ESI-only tool can see. If you
          do not, you are permanently limited to restating what the in-game market window
          already shows. Build the snapshotter first, before any UI.
        </Text>
      </Callout>

      <Stack gap={12}>
        <H2>Pipeline shape</H2>
        <Text tone="secondary">
          Every tool below sits at one of these stages. The two accented stages are the ones
          that do not exist in any ESI-only tool, and are where your differentiation comes
          from.
        </Text>
        <Grid columns={5} gap={10}>
          <PipelineStage
            index={1}
            label="Ingest"
            detail="Poll books and history on cache-respecting schedules."
          />
          <PipelineStage
            index={2}
            label="Diff and persist"
            detail="Store order lifecycles, not snapshots."
            emphasis
          />
          <PipelineStage
            index={3}
            label="Derive"
            detail="Quotes, depth, per-side volume, competition."
            emphasis
          />
          <PipelineStage
            index={4}
            label="Score"
            detail="Fees, margins, fill probability, sizing."
          />
          <PipelineStage
            index={5}
            label="Act"
            detail="Scanners, alerts, worklist, P&L."
          />
        </Grid>
      </Stack>

      <Stack gap={12}>
        <H2>Ingest cadence and cost</H2>
        <Text tone="secondary">
          The order-book route returns at most 1,000 orders per page, so one full pull of a
          region costs one request per page. The Forge currently holds roughly 419,000 public
          orders, which is about 419 requests per full pull. That is the unit of cost for
          everything below.
        </Text>

        <H3>Rate limits are not the constraint</H3>
        <Text tone="secondary">
          Since 24 February 2026 the `market-order` route group is limited to 12,000 tokens
          per rolling 15-minute window, at 2 tokens per successful response, refilled after 15
          minutes. CCP sized this deliberately: their announcement puts all 113 regions at
          1,723 pages and states the budget is enough to fetch every region every five
          minutes. Polling The Forge alone at full cadence costs about a fifth of the budget.
        </Text>
        <BarChart
          categories={["The Forge only", "All 113 regions"]}
          series={[{ name: "Tokens consumed per 15-minute window", data: [2514, 10338] }]}
          referenceLines={[{ value: 12000, label: "Rate limit", tone: "danger" }]}
          valueSuffix=" tokens"
          height={200}
        />
        <Text size="small" tone="tertiary">
          Tokens consumed per 15-minute window by order-book polling scope, against CCP's
          12,000-token limit. Derived as pages × 3 cache cycles per window × 2 tokens per 200
          response, using CCP's published figure of 1,723 pages across all regions and ~419
          pages for The Forge at 419,000 orders. Source: EVE Developers rate-limiting
          documentation and the February 2026 market-orders rate limit announcement.
        </Text>

        <H3>Storage is the constraint, and only if you store snapshots</H3>
        <Text tone="secondary">
          The two figures usually quoted both describe storing complete order books
          repeatedly. A developer archiving all EVE market data reported on the official
          forums that each compressed Forge snapshot was 5.9 MB, which at 288 snapshots a day
          is roughly 1.7 GB/day for that one region — measured when The Forge held about
          285,000 orders, so closer to 2.5 GB/day at today's count. Separately, a single
          order-book page measures 306 KB of JSON, putting one uncompressed Forge snapshot at
          about 112 MB and the major hubs at roughly 72 GB/day.
        </Text>
        <Text tone="secondary">
          Both describe the approach this plan avoids. Storing diffs changes the arithmetic
          entirely: between consecutive polls most orders are byte-identical, so you write
          only created, repriced, partially-consumed and vanished orders, and write volume
          becomes a function of churn rather than market size. Measure your actual churn in
          the first week and size storage from that rather than trusting any estimate.
        </Text>

        <H3>Choosing a cadence</H3>
        <Text tone="secondary">
          You do not have to poll every five minutes, and for most regions you should not.
          What degrades as you slow down is not price accuracy — it is your ability to see
          events between polls. An order created and fully consumed inside one interval is
          invisible at any cadence, so the interval sets a floor on what you can ever know.
        </Text>
        <Table
          headers={[
            "Cadence",
            "Requests/day",
            "Tokens/window",
            "Still get",
            "Lose",
          ]}
          rows={CADENCE_ROWS.map((r) => [r[0], r[1], r[2], r[3], r[4]])}
          columnAlign={["left", "right", "right", "left", "left"]}
          striped
        />
        <Text size="small" tone="tertiary">
          Requests assume ~419 pages per full regional pull of The Forge. Token cost is pages
          × pulls-per-15-minutes × 2 tokens per successful response.
        </Text>

        <Callout tone="info" title="Tier cadence by region, and always pull whole regions">
          <Text>
            Fetching a region is far cheaper per item than fetching types. One Forge pull is
            ~419 requests and returns every tradeable type; fetching 500 watchlist types
            individually costs ~500 requests and returns only those 500. Scope by region and
            cadence, never by type. Run your home region at 5 or 10 minutes, where the
            competition and per-side-volume signal actually pays — Adam4EVE runs its public
            trade tracker at 10 minutes and publishes the output as a usable estimate. Other
            hub regions hourly is ample for arbitrage. Daily history is a separate, trivially
            cheap job that can be missed without permanent loss.
          </Text>
        </Callout>
      </Stack>

      <Stack gap={14}>
        <Row align="center" gap={12} wrap>
          <H2 style={{ margin: 0 }}>Tool catalog</H2>
          <Row gap={6} wrap>
            {TIERS.map((x) => (
              <Pill key={x} active={tier === x} size="sm" onClick={() => setTier(x)}>
                {x}
              </Pill>
            ))}
          </Row>
          <Text size="small" tone="tertiary">
            {shown} of {total} shown
          </Text>
        </Row>
        <Text tone="secondary">
          Foundation means nothing downstream works without it. Core is what makes the app
          worth opening daily. Advanced is worth building only once several months of
          substrate has accumulated. Expand any row for rationale, inputs, output, the
          relevant math, and the specific failure mode to avoid.
        </Text>

        {visibleLayers.map((layer) => (
          <Stack key={layer.id} gap={8} style={{ marginTop: 8 }}>
            <H3>{layer.title}</H3>
            <Text size="small" tone="secondary">
              {layer.blurb}
            </Text>
            <Divider />
            <Stack gap={0}>
              {layer.tools.map((tool) => (
                <ToolRow key={tool.name} tool={tool} />
              ))}
            </Stack>
          </Stack>
        ))}
      </Stack>

      <Stack gap={10}>
        <H2>Reference: the fee math the engine must implement</H2>
        <Text tone="secondary">
          Verified against CCP's help centre and the EVE University wiki as of 2026. These
          five formulas decide whether every number in the app is right or quietly wrong by a
          few percent, which on a typical station trade is the entire margin.
        </Text>
        <Table
          headers={["Quantity", "Formula", "Notes"]}
          rows={FEE_ROWS.map(([a, b, c]) => [a, b, c])}
          columnAlign={["left", "left", "left"]}
          striped
        />
      </Stack>

      <Stack gap={10}>
        <H2>Mechanics that invalidate naive tools</H2>
        <Text tone="secondary">
          Each of these breaks an assumption most market tools make implicitly. Worth encoding
          as tests rather than remembering.
        </Text>
        <Table
          headers={["Trap", "What it means for the design"]}
          rows={TRAPS.map(([a, b]) => [a, b])}
          columnAlign={["left", "left"]}
          striped
        />
      </Stack>

      <Stack gap={10}>
        <H2>Suggested build order</H2>
        <Table
          headers={["", "Focus", "Contents and rationale"]}
          rows={PHASES.map(([a, b, c]) => [a, b, c])}
          columnAlign={["left", "left", "left"]}
        />
      </Stack>

      <Stack gap={10}>
        <H2>Sources</H2>
        <Table
          headers={["Reference", "Used for"]}
          rows={SOURCES.map(([label, href, note]) => [`[${label}](${href})`, note])}
          columnAlign={["left", "left"]}
          striped
        />
      </Stack>

      <Card>
        <CardHeader>If you only build three things</CardHeader>
        <CardBody>
          <Stack gap={8}>
            <Text>
              <Text as="span" weight="semibold">
                The order-book differ,
              </Text>{" "}
              because it is the only irreversible decision on this page — history you do not
              record today cannot be recovered tomorrow.
            </Text>
            <Text>
              <Text as="span" weight="semibold">
                The volume-balance screen,
              </Text>{" "}
              because buy-side versus sell-side split is the highest-signal filter available
              and ESI will never give it to you directly.
            </Text>
            <Text>
              <Text as="span" weight="semibold">
                The relist cost model,
              </Text>{" "}
              because recurring relist fees on full order value are where station-trading
              profit actually disappears, and essentially no public tool accounts for them.
            </Text>
            <Divider />
            <Text size="small" tone="tertiary">
              Those three, plus a fee resolver and a single item page, constitute a tool that
              is already better informed than anything you can buy or browse.
            </Text>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
