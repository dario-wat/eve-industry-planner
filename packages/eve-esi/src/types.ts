/**
 * ESI response types. Only the fields this app reads are modelled, so these
 * are not a full copy of CCP's schema.
 */

/** One page of a paged ESI endpoint. `pages` is the `x-pages` header. */
export interface EsiPage<T> {
  data: T[];
  pages: number;
}

export interface EsiPosition {
  x: number;
  y: number;
  z: number;
}

export interface EsiAsset {
  is_singleton: boolean;
  item_id: number;
  location_flag: string;
  location_id: number;
  location_type: string;
  quantity: number;
  type_id: number;
}

export interface EsiAssetName {
  item_id: number;
  name: string;
}

export interface EsiStructure {
  name: string;
  owner_id: number;
  position: EsiPosition;
  solar_system_id: number;
  type_id: number;
}

export interface EsiStation {
  max_dockable_ship_volume?: number;
  name: string;
  office_rental_cost?: number;
  owner?: number;
  position: EsiPosition;
  race_id?: number;
  reprocessing_efficiency?: number;
  reprocessing_stations_take?: number;
  services?: string[];
  station_id: number;
  system_id: number;
  type_id: number;
}

export interface EsiSolarSystem {
  constellation_id: number;
  name: string;
  planets?: {
    asteroid_belts?: number[];
    moons?: number[];
    planet_id: number;
  }[];
  position: EsiPosition;
  security_class?: string;
  security_status: number;
  star_id?: number;
  stargates?: number[];
  stations?: number[];
  system_id: number;
}

export interface EsiConstellation {
  constellation_id: number;
  name: string;
  position: EsiPosition;
  region_id: number;
  systems: number[];
}

export interface EsiIndustryJob {
  /** ESI activity ID, e.g. 1 manufacturing. The app narrows this itself. */
  activity_id: number;
  blueprint_id: number;
  blueprint_location_id: number;
  blueprint_type_id: number;
  cost: number;
  duration: number;
  end_date: string;
  facility_id: number;
  installer_id: number;
  job_id: number;
  licensed_runs: number;
  output_location_id: number;
  probability: number;
  product_type_id: number;
  runs: number;
  start_date: string;
  station_id: number;
  status: string;
}

export interface EsiContract {
  acceptor_id: number;
  assignee_id: number;
  availability: string;
  collateral: number;
  contract_id: number;
  date_accepted?: string;
  date_completed?: string;
  date_expired: string;
  date_issued: string;
  days_to_complete: number;
  end_location_id: number;
  for_corporation: boolean;
  issuer_corporation_id: number;
  issuer_id: number;
  price: number;
  reward: number;
  start_location_id: number;
  status: string;
  title: string;
  type: string;
  volume: number;
}

export interface EsiName {
  category: string;
  id: number;
  name: string;
}

export interface EsiPortrait {
  px64x64: string;
  px128x128: string;
  px256x256: string;
  px512x512: string;
}

export interface EsiWalletTransaction {
  client_id: number;
  date: string;
  is_buy: boolean;
  is_personal: boolean;
  journal_ref_id: number;
  location_id: number;
  quantity: number;
  transaction_id: number;
  type_id: number;
  unit_price: number;
}

export interface EsiWalletJournalEntry {
  amount: number;
  balance: number;
  context_id: number | null;
  context_id_type: string | null;
  date: string;
  description: string;
  first_party_id: number;
  id: number;
  reason: string;
  ref_type: string;
  second_party_id: number;
}

/**
 * Shared by region, structure and character order endpoints, so the fields
 * that not every endpoint returns are optional.
 */
export interface EsiMarketOrder {
  duration: number;
  is_corporation: boolean;
  issued: string;
  location_id: number;
  order_id: number;
  price: number;
  range: string;
  region_id: number;
  type_id: number;
  volume_remain: number;
  volume_total: number;
  is_buy_order?: boolean;
  min_volume?: number;
  system_id?: number;
}

export type EsiMarketOrderType = 'all' | 'buy' | 'sell';

export interface EsiMarketHistory {
  average: number;
  date: string;
  highest: number;
  lowest: number;
  order_count: number;
  volume: number;
}
