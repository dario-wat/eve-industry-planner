export type EveAssetsRes = {
  character_name: string;
  name: string;
  typeId: number;
  categoryId: number | undefined;
  quantity: number;
  location: string;
}[];

export type EveAssetsLocationsRes = {
  locationId: number;
  locationName: string;
}[];

type EveNameRes = {
  category: string;
  id: number;
  name: string;
};

export type EveContractsRes = {
  title: string;
  status: string;
  price: number;
  type: string;
  availability: string;
  assignee: EveNameRes | null;
  issuer: EveNameRes | null;
  acceptor: EveNameRes | null;
  date_expired: string;
  date_accepted: string | null;
}[];

export type EveIndustryJobsRes = {
  character_name: string;
  activity: string;
  blueprint_name: string;
  progress: number;
  end_date: string;
  runs: number;
  location: string | null;
  status: string;
  product_name: string;
  product_type_id: number;
  category_id: number | undefined;
}[];

export type EveIndustryJobHistoryRes = {
  product_name: string;
  product_type_id: number;
  category_id: number | undefined;
  category_name: string | undefined;
  meta: number | null | undefined;
  count: number;
}[];

export type EvePortraitRes = {
  px64x64: string;
};

export type EveLoggedInUserRes = {
  character_ids: number[];
  character_names: string[];
};

export type PlannedProductsRes = {
  name: string;
  typeId: number;
  group: string;
  categoryId: number | undefined;
  quantity: number;
  stock: number;
  active: number;
}[];

export type PlannedProductsWithErrorRes = {
  name: string;
  typeId?: number;
  group?: string;
  categoryId?: number | undefined;
  quantity?: number;
  stock?: number;
  active?: number;
  error?: string;
}[];

export type MaterialStationRes = {
  station_name: string | null;
  station_id: number;
};

export type MaterialStationsRes = MaterialStationRes[];

export type ProductionPlanRes = {
  blueprintRuns: {
    typeId: number;
    categoryId: number | undefined;
    productionCategory: string;
    blueprintExists: boolean;
    name: string;
    runs: number;
    activeRuns: number;
    daysToRun: number;
  }[];
  materials: {
    typeId: number;
    categoryId: number | undefined;
    name: string;
    quantity: number;
  }[];
};

export type WalletTransactionsRes = {
  characterName: string;
  date: string;
  isBuy: boolean;
  locationName: string | null;
  locationId: number;
  quantity: number;
  typeId: number;
  name: string;
  categoryId: number | undefined;
  unitPrice: number;
}[];

export type FeesAndTaxesRes = {
  date: string;
  amount: number;
  type: string;
}[];

export type MarketOrdersRes = {
  characterName: string;
  typeId: number;
  name: string;
  categoryId: number | undefined;
  locationName: string | null;
  locationId: number;
  price: number;
  volumeRemain: number;
  volumeTotal: number;
  isBuy: boolean;
  issuedDate: string;
  duration: number;
}[];

export type CharacterSummaryRes = {
  characterId: number;
  characterName: string;
} & ({
  error: null;
  walletBalance: number;
  orderSlots: number;
  /** Counts corporation orders too. */
  orderSlotsUsed: number;
  /** Price x remaining volume, without corporation orders. */
  buyOrderValue: number;
  sellOrderValue: number;
} | {
  error: string;
});

export type CharacterContextRes = CharacterSummaryRes[];

/**
 * Personal assets at the best Jita 4-4 buy and sell order, without blueprint copies.
 * Null when the assets could not be valued.
 */
export type CharacterAssetValuesRes = {
  characterId: number;
  buyValue: number | null;
  sellValue: number | null;
}[];

/** Daily snapshots from the net worth job. Order values are price x remaining volume. */
export type NetWorthHistoryRes = {
  characters: { characterId: number; characterName: string }[];
  days: {
    day: string;
    characterId: number;
    wallet: number;
    buyOrders: number;
    sellOrders: number;
    /** Personal assets at the best Jita 4-4 buy and sell order. */
    assetsBuy: number;
    assetsSell: number;
  }[];
};

export type MarketHistoryRes = {
  average: number;
  date: string;
  highest: number;
  lowest: number;
  order_count: number;
  volume: number;
}[];

export type MarketHistoryScanWindowRes = {
  windowDays: number;
  medianPrice: number | null;
  priceChange: number | null;
  medianUnits: number;
  medianIsk: number;
  medianOrders: number;
  daysTraded: number;
  medianRange: number | null;
  iskWeightedRange: number | null;
  medianPriceInRange: number | null;
};

export type MarketHistoryScanItemRes = {
  typeId: number;
  name: string;
  categoryId: number | null;
  categoryName: string | null;
  windows: MarketHistoryScanWindowRes[];
};

export type MarketHistoryScanRes = {
  regionId: number;
  asOfDate: string;
  items: MarketHistoryScanItemRes[];
};

export type LinkedCharacterRes = {
  characterId: number;
  characterName: string | undefined;
  portrait: string | null;
  /** The character has no usable login and has to log in again. */
  tokenExpired: boolean;
  /** Picked in the global character selector, so the data views include it. */
  selected: boolean;
}[];

export type EveSdeTypesRes = { id: number; name: string }[];

export type MarketOrdersComparisonRes = {
  stationId: number;
  stationName: string;
  items: {
    typeId: number;
    categoryId: number | undefined;
    name: string;
    price: number | null;
    quantity: number;
  }[];
}[];

export type ParseErrorRes = { name: string; error: string }[];

export type MarketOrdersComparisonWithErrorsRes = MarketOrdersComparisonRes | ParseErrorRes;

export type JobRunStatusRes = 'running' | 'success' | 'failure';

export type JobRunRes = {
  id: number;
  status: JobRunStatusRes;
  startedAt: string;
  finishedAt: string | null;
  elapsedMs: number | null;
  peakRssMb: number | null;
  error: string | null;
  summary: Record<string, unknown> | null;
};

export type JobsRes = {
  jobName: string;
  /** Null for jobs that only run by hand. */
  schedule: string | null;
  /** Newest first. */
  runs: JobRunRes[];
}[];
