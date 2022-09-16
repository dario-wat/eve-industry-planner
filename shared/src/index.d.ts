export * from './lib/util';

export type EveAssetsRes = {
  name: string,
  type_id: number,
  quantity: number,
  location_id: number,
  location: string,
}[];

type EveName = {
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
  assignee: EveName | null,
  issuer: EveName | null,
  acceptor: EveName | null,
  date_expired: string,
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
}[];

export type PlannedProductsWithErrorRes = {
  name: string,
  quantity?: number,
  error?: string,
}[];

export type MaterialStationsRes = {
  station_name: string | null,
  station_id: number,
}[];

export type ManufactureTreeRes = {
  type_id: number,
  name: string,
  quantity: number,
  materials: ManufactureTreeRes[],
}