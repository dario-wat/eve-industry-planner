import { EveAssetsLocationsRes, MarketOrdersComparisonRes } from "@internal/shared";
import { Autocomplete, Box, Button, CircularProgress, TextField } from "@mui/material";
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import axios from "axios";
import useAxios from 'axios-hooks';
import React, { useState } from "react";
import { uniq } from "underscore";
import EveIconAndName from "./util/EveIconAndName";
import { formatNumber } from "./util/numbers";

// TODO add full prices
// TODO handle error with station name being a number in the browser

type Location = { locationId: number; locationName: string };

type ItemPrices = {
  typeId: number;
  categoryId: number | undefined;
  name: string;
  [key: `price_${number}`]: number | null; // `price_{stationId}`
}

const STATIONS: Location[] = [{
  locationId: 60003760,
  locationName: 'Jita IV - Moon 4 - Caldari Navy Assembly Plant',
}];

export default function MarketComparisonPage() {
  const [
    selectedStations, 
    setSelectedStations,
  ] = useState<Location[]>([]);
  const [text, setText] = useState('');
  
  const [data, setData] = useState<MarketOrdersComparisonRes | null>(null);

  const onSubmit = async () => {
    // TODO loading indicator
    const { data } = await axios.post<MarketOrdersComparisonRes>(
      '/market_comparison',
      {
         stationIds: selectedStations.map(({ locationId }) => locationId), 
         text ,
      },
    );
    setData(data);
  };
  
  return (
    <>
    <Card>
      <CardContent>
        <Box sx={{ width: '600px' }}>
          <StationSelector
            selectedStations={selectedStations} 
            setSelectedStations={setSelectedStations} 
          />
        </Box>
        <TextField 
          sx={{ pt: 2, pb: 2 }} 
          fullWidth
          rows={12}
          multiline
          placeholder={
            'Items to compare in format: <item name> <volume>.\n' 
            + 'E.g. Scimitar 2'
          }
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <Button variant="contained" size="medium" onClick={onSubmit}>
          Submit
        </Button>
      </CardContent>
    </Card>
    { data && 
      <Box  sx={{ pt: 4 }}>
        <MarketComparisonDataGrid data={data} />
      </Box>
    }
    </>
  );
}

function StationSelector(props: {
  selectedStations: EveAssetsLocationsRes;
  setSelectedStations: (values: EveAssetsLocationsRes) => void;
}) {
  const [{
    data: assetLocations,
    loading,
  }] = useAxios<EveAssetsLocationsRes>('/assets_locations');
  const locations = uniq(
    [...assetLocations ?? [], ...STATIONS], 
    ({ locationId }) => locationId,
  );
  return (
    <Autocomplete
      multiple
      loading={loading}
      options={locations}
      getOptionLabel={(option: any) => option.locationName}
      filterSelectedOptions
      isOptionEqualToValue={
        (option, value) => option.locationId === value.locationId
      }
      value={props.selectedStations}
      onChange={(_, values) => { props.setSelectedStations(values); }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Stations"
          InputProps={{
            ...params.InputProps,
            endAdornment: (loading &&
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

function MarketComparisonDataGrid({ data }: { data: MarketOrdersComparisonRes }) {
  const priceData = formatDataPrices(data);

  const extraColumns: GridColDef[] = data.map(({ stationId, stationName }) => ({
    field: `price_${stationId}`,
    headerName: stationName,
    width: 200,
    sortable: false,
    align: 'right',
    valueFormatter: value => value === null ? '-' : formatNumber(value, 2),
  }));

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      width: 300,
      sortable: false,
      renderCell: params =>
        <EveIconAndName
          typeId={params.row.typeId}
          categoryId={params.row.categoryId}
          name={params.row.name}
        />,
    },
    ...extraColumns,
  ];
  return (
    <Card>
      <CardContent>
        <DataGrid 
        rows={priceData} 
        columns={columns} 
        disableRowSelectionOnClick 
        disableColumnMenu
      />
      </CardContent>
    </Card>
  );
}

/**
 * Takes data returned by the market comparison endpoint and formats it
 * so that each row contains the item details and a price for each station.
 */
function formatDataPrices(data: MarketOrdersComparisonRes): ItemPrices[] {
  const formattedData: { [typeId: number]: ItemPrices } = {};
  for (const { stationId, items } of data) {
    for (const { typeId, categoryId, name, price } of items) {
      if (!(typeId in formattedData)) {
        formattedData[typeId] = { typeId, categoryId, name };
      }
      formattedData[typeId][`price_${stationId}`] = price;
    }
  }
  return Object.values(formattedData);
}