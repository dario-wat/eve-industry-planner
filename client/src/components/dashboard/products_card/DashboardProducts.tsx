import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import LoadingButton from '@mui/lab/LoadingButton';
import { useState } from 'react';
import axios from 'axios';
import { PlannedProductsRes } from '@internal/shared';
import DashboardProductsTextArea from './DashboardProductsTextArea';
import DashboardProductsDataGrid from './DashboardProductsDataGrid';

// TODO this will need a rework
export default function DashboardProducts(props: {
  group: string,
  plannedProducts: PlannedProductsRes,
  onItemChange: () => void,
  onGroupDelete: () => void,
  onUpdate: (plannedProducts: PlannedProductsRes) => void,
}) {
  const [useGrid, setUseGrid] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const onDeleteClick = async () => {
    setIsDeleting(true);
    const { status } = await axios.delete(
      `/planned_product_group_delete/${props.group}`,
    );
    if (status === 200) {
      props.onGroupDelete();
    }
    setIsDeleting(false);
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
          onClick={onDeleteClick}
        >
          Delete
        </LoadingButton>
      </Box>
      {useGrid
        ?
        <DashboardProductsDataGrid
          group={props.group}
          plannedProducts={props.plannedProducts}
          onItemDelete={props.onItemChange}
          onItemAdd={props.onItemChange} />
        :
        <DashboardProductsTextArea
          group={props.group}
          plannedProducts={props.plannedProducts}
          onUpdate={pps => {
            props.onUpdate(pps);
            setUseGrid(true);
          }} />
      }
    </>
  );
}