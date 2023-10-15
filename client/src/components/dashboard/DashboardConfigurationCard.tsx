import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import axios from 'axios';
import useAxios from 'axios-hooks';
import React, { useEffect, useState } from 'react';
import { AlwaysBuyItemsRes, EveAssetsLocationsRes, EveSdeTypesRes, MaterialStationsRes } from '@internal/shared';
import { uniq } from 'underscore';

export default function DashboardConfigurationCard() {
  return (
    <Card>
      <CardContent>
        <Box sx={{ pb: 2 }}>
          <Typography variant="h6">
            Configuration
          </Typography>
        </Box>
        <Box sx={{ pb: 2 }}>
          <MaterialStationConfig />
        </Box>
        {/* <AlwaysBuyConfig /> */}
      </CardContent>
    </Card>
  );
}

function MaterialStationConfig() {
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
    <Autocomplete
      multiple
      loading={loadingStations}
      options={locations}
      getOptionLabel={(option: any) => option.station_name}
      filterSelectedOptions
      isOptionEqualToValue={
        (option, value) => option.station_id === value.station_id
      }
      value={stations}
      onChange={(_, values) => { onChange(values); }}
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
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AlwaysBuyConfig() {
  // TODO refresh production plan, possibly use isolated as recoil
  const [{
    data: typesData,
    loading: loadingTypes,
  }] = useAxios<EveSdeTypesRes>('/type_ids_items');
  const autocompleteData: AlwaysBuyItemsRes = typesData?.map(d => ({
    typeId: d.id,
    typeName: d.name,
  })) || [];

  const [{
    data: alwaysBuyData,
    loading: loadingAlwaysBuy,
  }] = useAxios<AlwaysBuyItemsRes>('/always_buy_items');

  const [alwaysBuy, setAlwaysBuy] = useState<AlwaysBuyItemsRes>([]);
  useEffect(() => setAlwaysBuy(alwaysBuyData ?? []), [alwaysBuyData]);

  const [updatingAlwaysBuy, setUpdatingAlwaysBuy] = useState(false);
  const onChange = async (values: AlwaysBuyItemsRes) => {
    setUpdatingAlwaysBuy(true);
    setAlwaysBuy(values);
    const { data } = await axios.post<AlwaysBuyItemsRes>(
      '/always_buy_items_update',
      { typeIds: values.map(v => v.typeId) },
    );
    setAlwaysBuy(data);
    setUpdatingAlwaysBuy(false);
  };

  return (
    <Autocomplete
      multiple
      loading={loadingAlwaysBuy}
      options={autocompleteData ?? []}
      filterOptions={createFilterOptions({ matchFrom: 'any', limit: 10 })}
      getOptionLabel={option => option.typeName}
      isOptionEqualToValue={(option, value) => option.typeId === value.typeId}
      value={alwaysBuy}
      onChange={(_, values) => { onChange(values); }}
      renderOption={(props, option: any) =>
        <li
          {...props}
          style={{
            paddingLeft: '8px',
            paddingTop: '2px',
            paddingBottom: '2px',
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            {option.typeName}
          </Typography>
        </li>
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Always Buy Item"
          InputProps={{
            ...params.InputProps,
            endAdornment: ((loadingTypes || updatingAlwaysBuy) &&
              <React.Fragment>
                {<CircularProgress color="inherit" size={20} />}
                {params.InputProps.endAdornment}
              </React.Fragment>
            ),
          }}
        />
      )}
    />
  );
}