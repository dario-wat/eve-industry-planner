# Market lists

Three lists, each smaller than the one above it. Later steps, such as order books, will use the smallest list.

## Catalog

Every item in the game data.

Loaded from the static game data. This is the full set of items, including ones that are never sold on the market.

## Tradeable

Items that can be sold on the regional market and are in scope for station trading. About 11,000 items. Published items with a market group, excluding categories that are a different kind of trade, such as blueprints, skins, and apparel.

On the 1st of each month, the history sync fetches daily market history for every tradeable item (`npm run sync-market-history`) and stores it. That stored history is the record of what actually traded: price, units, and trade count per day. The sync also rewrites each item's 7/30/90-day summaries.

## Candidates

Tradeable items worth keeping up to date. Not stored as a list: each candidate run reads them from the current 30-day summaries.

An item is a candidate when both are true:

- It traded on at least 27 of those 30 days.
- Its median daily ISK traded is at least 1B. Days with no trades count as zero.

The thresholds are constants in `MarketHistorySummaryService.ts`.

Every other day of the month, the history sync runs on candidates only (`npm run sync-market-history -- --candidates`) and rewrites their summaries. So membership can change on any run:

- An item that falls under the line drops out on the next candidate run. Its summary is not refreshed again until the monthly run.
- A quiet item can join only on the monthly run, because only that run refreshes non-candidate summaries.
