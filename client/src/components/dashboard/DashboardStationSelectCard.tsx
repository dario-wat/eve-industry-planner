import Autocomplete from '@mui/material/Autocomplete';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import axios from 'axios';
import useAxios from 'axios-hooks';
import React, { useEffect, useState } from 'react';
import { EveAssetsLocationsRes, MaterialStationsRes } from '@internal/shared';
import { uniq } from 'underscore';

export default function DashboardStationSelectCard() {
  // TODO(EIP-20) this is used in multiple places. That shouldn't be the case
  // I should somehow memoize this
  const [{
    data: assetLocations,
    loading: loadingAssets,
  }] = useAxios<EveAssetsLocationsRes>('/assets_locations');

  const locations: MaterialStationsRes = assetLocations
    ? uniq(assetLocations, d => d.locationId).map(a => ({
      station_name: a.locationName,
      station_id: a.locationId,
    }))
    : [];

  const [{
    data: materialStations,
    loading: loadingStations,
  }] = useAxios<MaterialStationsRes>('/material_stations');

  const [stations, setStations] = useState<MaterialStationsRes>([]);
  useEffect(() => setStations(materialStations ?? []), [materialStations]);

  const [updatingStations, setUpdatingStations] = useState(false);
  const onChange = async (values: MaterialStationsRes) => {
    setUpdatingStations(true);
    setStations(values);
    const { data } = await axios.post<MaterialStationsRes>(
      '/material_stations_update',
      { stations: values },
    );
    setStations(data);
    setUpdatingStations(false);
  };

  return (
    <Card sx={{ height: 500 }}>
      <CardContent>
        <Autocomplete
          multiple
          loading={loadingStations}
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
              InputProps={{
                ...params.InputProps,
                endAdornment: ((loadingAssets || updatingStations) &&
                  <React.Fragment>
                    {<CircularProgress color="inherit" size={20} />}
                    {params.InputProps.endAdornment}
                  </React.Fragment>
                ),
              }}
            />
          )}
        />
      </CardContent>
    </Card>
  );
}