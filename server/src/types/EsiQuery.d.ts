export interface EveAsset {
  is_singleton: boolean,
  item_id: number,
  location_flag: string,
  location_id: number,
  location_type: string,
  quantity: number,
  type_id: number,
}

export interface EveAssetName {
  item_id: number,
  name: string,
}

interface EvePosition {
  x: number,
  y: number,
  z: number,
}

export interface EveStation {
  max_dockable_ship_volume: number,
  name: string,
  office_rental_cost: number,
  owner: number,
  position: EvePosition,
  race_id: number,
  reprocessing_efficiency: number,
  reprocessing_stations_take: number,
  services: string[],
  station_id: number,
  system_id: number,
  type_id: number,
}

export interface EveStructure {
  name: string,
  owner_id: number,
  position: EvePosition,
  solar_system_id: number,
  type_id: number,
}

export interface EveIndustryJob {
  activity_id: number,
  blueprint_id: number,
  blueprint_location_id: number,
  blueprint_type_id: number,
  cost: number,
  duration: number,
  end_date: string,
  facility_id: number,
  installer_id: number,
  job_id: number,
  licensed_runs: number,
  output_location_id: number,
  probability: number,
  product_type_id: number,
  runs: number,
  start_date: string,
  station_id: number,
  status: string,
}