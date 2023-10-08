import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import LoadingButton from '@mui/lab/LoadingButton';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { PlannedProductsRes } from '@internal/shared';
import DashboardProductsTextArea from './DashboardProductsTextArea';
import DashboardProductsDataGrid from './DashboardProductsDataGrid';
import useProductionPlanState from '../useProductionPlanState';

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
  const [isIsolated, setIsIsolated] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const onDeleteGroupClick = async () => {
    setIsDeleting(true);
    const { status } = await axios.delete(
      `/planned_product_group_delete/${props.group}`,
    );
    setIsDeleting(false);
    if (status === 200) {
      props.onGroupDelete();
    }
  };

  const { fetchProductionPlan } = useProductionPlanState();

  const onProductChange = async () => {
    const { data } = await axios.get<PlannedProductsRes>(
      `/planned_products_group/${props.group}`,
    );
    setPlannedProducts(data);
    await fetchProductionPlan();
  };

  useEffect(
    () => {
      isIsolated
        ? fetchProductionPlan(props.group)
        : fetchProductionPlan();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isIsolated, props.group],
  );

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
        <FormControlLabel
          control={
            <Switch
              checked={isIsolated}
              onChange={e => {
                setIsIsolated(e.target.checked);
              }}
            />
          }
          label="Isolate"
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