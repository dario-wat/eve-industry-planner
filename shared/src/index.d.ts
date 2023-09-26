// Need this to export util
export * from './lib/util';

export type EveAssetsRes = {
  character_name: string,
  name: string,
  typeId: number,
  categoryId: number | undefined
  quantity: number,
  location: string,
}[];

export type EveAssetsLocationsRes = {
  locationId: number,
  locationName: string,
}[];

type EveNameRes = {
  category: string,
  id: number,
  name: string,
};

export type EveContractsRes = {
  title: string,
  status: string,
  price: number,
  type: string,
  availability: string,
  assignee: EveNameRes | null,
  issuer: EveNameRes | null,
  acceptor: EveNameRes | null,
  date_expired: string,
  date_accepted: string | null,
}[];

export type EveIndustryJobsRes = {
  character_name: string,
  activity: string,
  blueprint_name: string,
  progress: number,
  end_date: string,
  runs: number,
  location: string | null,
  status: string,
  product_name: string,
  product_type_id: number,
  category_id: number | undefined,
}[];

export type EveIndustryJobHistoryRes = {

}[];

export type EvePortraitRes = {
  px64x64: string,
};

export type EveLoggedInUserRes = {
  character_id: number | null,
  character_name: string | null,
  portrait: string | null,
};

export type PlannedProductsRes = {
  name: string,
  typeId: number,
  group: string,
  categoryId: number | undefined,
  quantity: number,
  stock: number,
  active: number,
}[];

export type PlannedProductsWithErrorRes = {
  name: string,
  typeId?: number,
  group?: string,
  categoryId?: number | undefined,
  quantity?: number,
  stock?: number,
  active?: number,
  error?: string,
}[];

export type MaterialStationsRes = {
  station_name: string | null,
  station_id: number,
}[];

export type ProductionPlanRes = {
  blueprintRuns: {
    typeId: number,
    categoryId: number | undefined,
    productionCategory: string,
    blueprintExists: boolean,
    name: string,
    runs: number,
    activeRuns: number,
    daysToRun: number,
  }[],
  materials: {
    typeId: number,
    categoryId: number | undefined,
    name: string,
    quantity: number,
  }[],
};

export type WalletTransactionsRes = {
  characterName: string,
  date: string,
  isBuy: boolean,
  locationName: string | null,
  locationId: number,
  quantity: number,
  typeId: number,
  name: string,
  categoryId: number | undefined,
  unitPrice: number,
}[];

export type MarketOrdersRes = {
  characterName: string,
  typeId: number,
  name: string,
  categoryId: number | undefined,
  locationName: string | null,
  locationId: number,
  price: number,
  volumeRemain: number,
  volumeTotal: number,
  isBuy: boolean,
  issuedDate: string,
  duration: number,
}[];

export type LinkedCharacterRes = {
  characterId: number,
  characterName: string | undefined,
  portrait: string,
}[];

export type ScribbleRes = {
  id: number,
  name: string,
  text: string,
};

export type ScribblesRes = ScribbleRes[];

export type EveSdeTypesRes = { id: number, name: string }[];

export type AlwaysBuyItemsRes = { typeId: number, typeName: string }[];