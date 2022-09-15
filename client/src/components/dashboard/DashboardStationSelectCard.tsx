import { Autocomplete, Card, CardContent, TextField } from '@mui/material';
import axios from 'axios';
import useAxios from 'axios-hooks';
import { useEffect, useState } from 'react';
import { EveAssetsRes, MaterialStationsRes } from '@internal/shared';
import { uniq } from 'underscore';

export default function DashboardStationSelectCard() {
  // TODO(EIP-20) this is used in multiple places. That shouldn't be the case
  // I should somehow memoize this
  const [{ data: eveAssets }] = useAxios<EveAssetsRes>('/assets');
  const locations: MaterialStationsRes = eveAssets
    ? uniq(eveAssets, d => d.location_id).map(a => ({
      station_name: a.location,
      station_id: a.location_id,
    }))
    : [];

  // TODO add loading indicators
  const [{ data: materialStations }] =
    useAxios<MaterialStationsRes>('/material_stations');
  const [stations, setStations] = useState<MaterialStationsRes>([]);
  useEffect(() => setStations(materialStations ?? []), [materialStations]);

  const onChange = async (values: MaterialStationsRes) => {
    setStations(values);
    const { data } = await axios.post<MaterialStationsRes>(
      '/material_stations_update',
      { stations: values },
    );
    setStations(data);
  };

  return (
    <Card sx={{ height: 500 }}>
      <CardContent>
        <Autocomplete
          multiple
          isOptionEqualToValue={
            (option, value) => option.station_id === value.station_id
          }
          value={stations}
          onChange={(_, values) => { onChange(values); }}
          options={locations}
          getOptionLabel={(option: any) => option.station_name}
          filterSelectedOptions
          renderInput={(params) => (
            <TextField
              {...params}
              label="Stations"
            />
          )}
        />
      </CardContent>
    </Card>
  );
}