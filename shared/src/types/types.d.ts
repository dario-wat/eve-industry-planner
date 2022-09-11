// NOTE!
// This file is used by both server and client code.

export type EveAssetsRes = {
  name: string,
  type_id: number,
  quantity: number,
  location_id: number,
  location: string,
}[];

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

export type PlannedProductsRes = {
  name: string,
  quantity: number,
}[];

export type MaterialStationsRes = {
  station_name: string | null,
  station_id: number,
}[];

export type ManufactureMaterialsRes = {
  type_id: number,
  name: string,
  quantity: number,
  materials: ManufactureMaterials[],
}