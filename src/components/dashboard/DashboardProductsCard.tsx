import {
  Box,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import DashboardProductsTextArea from './DashboardProductsTextArea';

export default function DashboardProductsCard() {
  const [useGrid, setUseGrid] = useState(true);

  const columns: GridColDef[] = [
    {
      field: 'product',
      headerName: 'Product',
      width: 300,
      sortable: false,
    },
    {
      field: 'quantity',
      headerName: 'Quantity',
      width: 100,
      sortable: false,
    },
  ];

  return (
    <Card sx={{ height: 500 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography style={{ display: 'inline-block' }} variant="h6" gutterBottom>
            Products
          </Typography>
          <FormControlLabel
            control={<Switch checked={useGrid} onChange={e => setUseGrid(e.target.checked)} />}
            label="Use Grid"
            labelPlacement="start"
          />
        </Box>
        {useGrid
          ?
          <DataGrid
            rows={[]}
            columns={columns}
            disableSelectionOnClick
            disableColumnMenu
            experimentalFeatures={{ newEditingApi: true }}
          />
          : <DashboardProductsTextArea />
        }
      </CardContent>
    </Card>
  );
}