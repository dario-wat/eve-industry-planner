import {
  EveAssetsLocationsRes,
  MarketOrdersComparisonRes,
  MarketOrdersComparisonWithErrorsRes,
  ParseErrorRes,
} from '@internal/shared';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  IconButton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import axios from 'axios';
import useAxios from 'axios-hooks';
import React, { useState } from 'react';
import { first, min, uniq } from 'underscore';
import EveIconAndName from './util/EveIconAndName';
import { ColoredNumber, formatNumber } from './util/numbers';
import { styled } from '@mui/system';
import { ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import CopySnackbar from './util/CopySnackbar';
import { sum } from 'mathjs';

type Location = { locationId: number; locationName: string };

type ItemPrices = {
  typeId: number;
  categoryId: number | undefined;
  name: string;
  quantity: number;
  [key: `price_${number}`]: number | null; // `price_{stationId}`
};

const STATIONS: Location[] = [
  {
    locationId: 60003760,
    locationName: 'Jita IV - Moon 4 - Caldari Navy Assembly Plant',
  },
  {
    locationId: 60008494,
    locationName: 'Amarr VIII (Oris) - Emperor Family Academy',
  },
];

export default function MarketComparisonPage() {
  const [selectedStations, setSelectedStations] = useState<Location[]>([]);
  const [text, setText] = useState('');

  const [data, setData] = useState<MarketOrdersComparisonRes | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const onSubmit = async () => {
    setIsLoading(true);
    const { data } = await axios.post<MarketOrdersComparisonWithErrorsRes>('/market_comparison', {
      stationIds: selectedStations.map(({ locationId }) => locationId),
      text,
    });
    setData(hasData(data) ? data : null);
    setErrors(hasErrors(data) ? data.map((d) => d.error) : []);
    setIsLoading(false);
  };

  const RedTextTypography = styled(Typography)(
    ({ theme }) => `
    color: red;
  `
  );

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
            placeholder={'Items to compare in format: <item name> <volume>.\n' + 'E.g. Scimitar 2'}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Box sx={{ pb: 2 }}>
            <RedTextTypography variant="body2">{first(errors)}</RedTextTypography>
          </Box>
          <Button variant="contained" size="medium" onClick={onSubmit} disabled={isLoading}>
            Submit
          </Button>
        </CardContent>
      </Card>
      {isLoading ? (
        <Box sx={{ pt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : data ? (
        <Box sx={{ pt: 4 }}>
          <MarketComparisonDataGrid data={data} />
        </Box>
      ) : null}
    </>
  );
}

function StationSelector(props: {
  selectedStations: EveAssetsLocationsRes;
  setSelectedStations: (values: EveAssetsLocationsRes) => void;
}) {
  const [{ data: assetLocations, loading }] = useAxios<EveAssetsLocationsRes>('/assets_locations');
  const locations = uniq(
    [...(assetLocations ?? []), ...STATIONS],
    ({ locationId }) => locationId
  ).filter(({ locationName }) => typeof locationName === 'string');
  return (
    <Autocomplete
      multiple
      loading={loading}
      options={locations}
      getOptionLabel={(option: any) => option.locationName}
      filterSelectedOptions
      disableCloseOnSelect
      isOptionEqualToValue={(option, value) => option.locationId === value.locationId}
      value={props.selectedStations}
      onChange={(_, values) => {
        props.setSelectedStations(values);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Stations"
          InputProps={{
            ...params.InputProps,
            endAdornment: loading && (
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
  const [isSingle, setIsSingle] = useState<boolean>(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const priceData = formatDataPrices(data);
  const stationIds = data.map(({ stationId }) => stationId);
  const lowestPrices = priceData.map((itemPrice) => {
    const stationPrices = stationIds.map((stationId) => ({
      stationId,
      price: itemPrice[`price_${stationId}`],
    }));
    const lowestPrice = min(stationPrices, ({ price }) => price);
    if (typeof lowestPrice === 'number') {
      return [itemPrice.typeId, null] as const;
    }
    return [
      itemPrice.typeId,
      {
        stationId: lowestPrice.stationId,
        price: lowestPrice.price,
        name: itemPrice.name,
        quantity: itemPrice.quantity,
      },
    ] as const;
  });
  const lowestPricesMap = Object.fromEntries(lowestPrices);

  const copyCheapestItems = (stationId: number) => {
    navigator.clipboard.writeText(
      lowestPrices
        .filter(([_, stationPrice]) => stationPrice?.stationId === stationId)
        .map(([_, stationPrice]) => `${stationPrice?.name} ${stationPrice?.quantity}`)
        .join('\r\n')
    );
    setSnackbarOpen(true);
  };

  const stationNameMap: Record<number, string> = Object.fromEntries(
    data.map(({ stationId, stationName }) => [stationId, stationName])
  );
  const stationTotals: Record<number, { stationName: string; totalPrice: number }> = {};
  for (const [_, stationPriceData] of lowestPrices) {
    if (stationPriceData === null || stationPriceData.price === null) {
      continue;
    }
    if (stationPriceData.stationId in stationTotals) {
      stationTotals[stationPriceData.stationId].totalPrice +=
        stationPriceData.quantity * stationPriceData.price;
    } else {
      stationTotals[stationPriceData.stationId] = {
        stationName: stationNameMap[stationPriceData.stationId],
        totalPrice: stationPriceData.quantity * stationPriceData.price,
      };
    }
  }

  const extraColumns: GridColDef[] = data.map(({ stationId, stationName }) => ({
    field: `price_${stationId}`,
    headerName: stationName,
    width: 200,
    sortable: false,
    align: 'right',
    renderCell: (params) => {
      const price: number | null = params.row[`price_${stationId}`] ?? null;
      const showPrice = price === null ? null : isSingle ? price : price * params.row.quantity;
      return !price || !showPrice ? (
        '-'
      ) : lowestPricesMap[params.row.typeId]?.stationId === stationId ? (
        <ColoredNumber number={showPrice} color="green" fractionDigits={2} />
      ) : (
        formatNumber(showPrice, 2)
      );
    },
    renderHeader: () => (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <IconButton size="small" onClick={() => copyCheapestItems(stationId)}>
          <ContentCopyIcon />
        </IconButton>
        <strong>{stationName}</strong>
      </Box>
    ),
  }));

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      width: 300,
      sortable: false,
      renderCell: (params) => (
        <EveIconAndName
          typeId={params.row.typeId}
          categoryId={params.row.categoryId}
          name={params.row.name}
        />
      ),
    },
    {
      field: 'quantity',
      headerName: 'Quantity',
      width: 120,
      sortable: false,
      valueFormatter: (value) => (value ? formatNumber(value) : '-'),
    },
    ...extraColumns,
  ];
  return (
    <Card>
      <CardContent>
        <ToggleButtonGroup
          sx={{ pb: 2 }}
          color="primary"
          size="small"
          value={isSingle ? 'single' : 'total'}
          exclusive
          onChange={(_, value) => setIsSingle(value === 'single')}
        >
          <ToggleButton value="single">Single</ToggleButton>
          <ToggleButton value="total">Total</ToggleButton>
        </ToggleButtonGroup>
        <DataGrid rows={priceData} columns={columns} disableRowSelectionOnClick disableColumnMenu />
        <Box sx={{ pt: 2 }}>
          <CombinedPriceDataGrid stationTotals={Object.values(stationTotals)} />
        </Box>
        <CopySnackbar open={snackbarOpen} onClose={() => setSnackbarOpen(false)} />
      </CardContent>
    </Card>
  );
}

function CombinedPriceDataGrid(props: {
  stationTotals: { stationName: string; totalPrice: number }[];
}) {
  const totalRow = {
    stationName: 'Total',
    totalPrice: sum(props.stationTotals.map(({ totalPrice }) => totalPrice)),
  };
  const columns: GridColDef[] = [
    {
      field: 'stationName',
      headerName: 'Station',
      width: 400,
      sortable: false,
    },
    {
      field: 'totalPrice',
      headerName: 'Total',
      width: 300,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatNumber(value, 2),
    },
  ];
  return (
    <DataGrid
      rows={[...props.stationTotals, totalRow]}
      columns={columns}
      disableRowSelectionOnClick
      disableColumnMenu
    />
  );
}

/**
 * Takes data returned by the market comparison endpoint and formats it
 * so that each row contains the item details and a price for each station.
 */
function formatDataPrices(data: MarketOrdersComparisonRes): ItemPrices[] {
  const formattedData: { [typeId: number]: ItemPrices } = {};
  for (const { stationId, items } of data) {
    for (const { typeId, categoryId, name, quantity, price } of items) {
      if (!(typeId in formattedData)) {
        formattedData[typeId] = { typeId, categoryId, name, quantity };
      }
      formattedData[typeId][`price_${stationId}`] = price;
    }
  }
  return Object.values(formattedData);
}

function hasErrors(data: MarketOrdersComparisonWithErrorsRes): data is ParseErrorRes {
  return data.length > 0 && 'error' in data[0];
}

function hasData(data: MarketOrdersComparisonWithErrorsRes): data is MarketOrdersComparisonRes {
  return data.length > 0 && 'stationId' in data[0];
}
