import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import LoadingButton from '@mui/lab/LoadingButton';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { PlannedProductsRes } from '@internal/shared';
import { useAppDispatch } from 'redux/hooks';
import { fetchProductionPlan } from 'redux/slices/productionPlanSlice';
import DashboardProductsTextArea from './DashboardProductsTextArea';
import DashboardProductsDataGrid from './DashboardProductsDataGrid';

export default function DashboardProducts(props: {
  group: string,
  plannedProducts: PlannedProductsRes,
  onGroupDelete: () => void,
}) {
  const [plannedProducts, setPlannedProducts] =
    useState<PlannedProductsRes>([]);
  useEffect(
    () => setPlannedProducts(props.plannedProducts),
    [props.plannedProducts],
  );

  const [useGrid, setUseGrid] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const onDeleteGroupClick = async () => {
    setIsDeleting(true);
    const { status } = await axios.delete(
      `/planned_product_group_delete/${props.group}`,
    );
    if (status === 200) {
      props.onGroupDelete();
    }
    setIsDeleting(false);
  };

  const dispatch = useAppDispatch();
  const onProductChange = async () => {
    const { data } = await axios.get<PlannedProductsRes>(
      `/planned_products_group/${props.group}`,
    );
    setPlannedProducts(data);
    dispatch(fetchProductionPlan());
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 2 }}>
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
        <LoadingButton
          loading={isDeleting}
          variant="contained"
          color="error"
          onClick={onDeleteGroupClick}
        >
          Delete
        </LoadingButton>
      </Box>
      {useGrid
        ?
        <DashboardProductsDataGrid
          group={props.group}
          plannedProducts={plannedProducts}
          onItemDelete={onProductChange}
          onItemAdd={onProductChange} />
        :
        <DashboardProductsTextArea
          group={props.group}
          plannedProducts={plannedProducts}
          onUpdate={() => {
            onProductChange();
            setUseGrid(true);
          }} />
      }
    </>
  );
}