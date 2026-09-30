# Market lists

Three lists, each smaller than the one above it. Later steps, such as order books, will use the smallest list.

## Catalog

Every item in the game data.

Loaded from the static game data. This is the full set of items, including ones that are never sold on the market.

## Tradeable

Items that can be sold on the regional market and are in scope for station trading. About 11,000 items. Published items with a market group, excluding categories that are a different kind of trade, such as blueprints, skins, and apparel.

Once a month, the history sync fetches daily market history for every tradeable item and stores it. That stored history is the record of what actually traded: price, units, and trade count per day.

## Candidates

Tradeable items worth keeping up to date. Built at the end of the monthly history sync, from the last 30 days of stored history.

An item is a candidate when both are true:

- It traded on at least 15 of those 30 days.
- Its typical daily ISK traded is above a floor. Days with no trades count as zero. The floor is not chosen yet.

An item that falls under the line stays on the list for about a week.

History for candidates is fetched again weekly, so recent prices and volume stay current. A daily fetch is cheap if the last week needs to stay exact. Membership in the list changes only on the monthly run. A full tradeable sync is what lets a quiet item join later.
