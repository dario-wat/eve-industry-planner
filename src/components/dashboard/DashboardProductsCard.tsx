import {
  Box,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import useAxios from 'axios-hooks';
import { useState } from 'react';
import DashboardProductsDataGrid from './DashboardProductsDataGrid';
import DashboardProductsTextArea from './DashboardProductsTextArea';

export default function DashboardProductsCard() {
  // TODO should use redux here to share the state between two components
  const [{ data }] = useAxios('/planned_products');

  const [useGrid, setUseGrid] = useState(true);

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
          ? <DashboardProductsDataGrid data={data} />
          : <DashboardProductsTextArea data={data} />
        }
      </CardContent>
    </Card>
  );
}