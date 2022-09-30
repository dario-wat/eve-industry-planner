import { IndustryActivityKey } from './lib/IndustryActivity';

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

export interface EveStructure {
  name: string,
  owner_id: number,
  position: EvePosition,
  solar_system_id: number,
  type_id: number,
}

export interface EveIndustryJob {
  activity_id: IndustryActivityKey,
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

export interface EveContract {
  acceptor_id: number,
  assignee_id: number,
  availability: string,
  collateral: number,
  contract_id: number,
  date_accepted?: string,
  date_completed?: string,
  date_expired: string,
  date_issued: string,
  days_to_complete: number,
  end_location_id: number,
  for_corporation: boolean,
  issuer_corporation_id: number,
  issuer_id: number,
  price: number,
  reward: number,
  start_location_id: number,
  status: string,
  title: string,
  type: string,
  volume: number,
}

export interface EveName {
  category: string,
  id: number,
  name: string,
}

export interface EvePortrait {
  px64x64: string,
  px128x128: string,
  px256x256: string,
  px512x512: string,
}

export interface EveWalletTransaction {
  client_id: number,
  date: string,
  is_buy: boolean,
  is_personal: boolean,
  journal_ref_id: number,
  location_id: number,
  quantity: number,
  transaction_id: number,
  type_id: number,
  unit_price: number,
}