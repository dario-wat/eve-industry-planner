import {
  Box,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import useAxios from 'axios-hooks';
import { useEffect, useState } from 'react';
import { PlannedProductsRes } from '@internal/shared';
import DashboardProductsDataGrid from './DashboardProductsDataGrid';
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
            onUpdate={pps => setPlannedProducts(pps)}
          />
        }
      </CardContent>
    </Card>
  );
}