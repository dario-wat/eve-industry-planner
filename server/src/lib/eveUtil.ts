/*
* According to https://docs.esi.evetech.net/docs/id_ranges.html stations
* IDs are in range [60.000.000, 64.000.000];
*/
export function isStation(id: number) {
  return id >= 60000000 && id <= 64000000;
}