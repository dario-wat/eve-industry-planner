export * from './lib/util';

export type EveAssetsRes = {
  name: string,
  type_id: number,
  category_id: number | undefined
  quantity: number,
  location_id: number,
  location: string,
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

export type EvePortraitRes = {
  px64x64: string,
};

export type EveLoggedInUserRes = {
  character_id: number | null,
  character_name: string | null,
};

export type PlannedProductsRes = {
  name: string,
  quantity: number,
  stock: number,
  active: number,
}[];

export type PlannedProductsWithErrorRes = {
  name: string,
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
    name: string,
    runs: number,
    activeRuns: number | undefined,
  }[],
  materials: {
    typeId: number,
    categoryId: number | undefined,
    name: string,
    quantity: number,
  }[],
};