import {
  Box,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import useAxios from 'axios-hooks';
import { useEffect, useState } from 'react';
import { PlannedProductsRes } from '@internal/shared';
import DashboardProductsTextArea from './DashboardProductsTextArea';

export default function DashboardProductsCard() {
  const [{ data }] = useAxios<PlannedProductsRes>('/planned_products');

  const [plannedProducts, setPlannedProducts] =
    useState<PlannedProductsRes>([]);
  useEffect(() => setPlannedProducts(data ?? []), [data]);

  const [useGrid, setUseGrid] = useState(true);

  return (
    <Card sx={{ height: 500 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography
            style={{ display: 'inline-block' }}
            variant="h6"
            gutterBottom
          >
            Products
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={useGrid}
                onChange={e => setUseGrid(e.target.checked)}
              />
            }
            label="Use Grid"
            labelPlacement="start"
          />
        </Box>
        {useGrid
          ? <DashboardProductsDataGrid plannedProducts={plannedProducts} />
          :
          <DashboardProductsTextArea
            plannedProducts={plannedProducts}
            onUpdate={pps => {
              setPlannedProducts(pps);
              setUseGrid(true);
            }}
          />
        }
      </CardContent>
    </Card>
  );
}

function DashboardProductsDataGrid(
  props: {
    plannedProducts: PlannedProductsRes,
  }
) {
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Product',
      width: 300,
      sortable: false,
    },
    {
      field: 'quantity',
      headerName: 'Quantity',
      width: 100,
      sortable: false,
      renderCell: params =>
        <div style={{
          color: params.row.stock >= params.row.quantity ? 'green' : 'default',
        }}>
          {Math.min(params.row.stock, params.row.quantity)
            + ' / '
            + params.row.quantity}
        </div>
    },
  ];

  return (
    <DataGrid
      rows={props.plannedProducts}
      columns={columns}
      disableSelectionOnClick
      disableColumnMenu
      experimentalFeatures={{ newEditingApi: true }}
    />
  );
}