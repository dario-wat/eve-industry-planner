import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import DeleteIcon from '@mui/icons-material/Delete';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import axios from 'axios';
import { useState } from 'react';
import { PlannedProductsRes } from '@internal/shared';
import EveIconAndName from 'components/util/EveIconAndName';
import ItemAutocomplete from 'components/util/ItemAutocomplete';

export default function DashboardProductsDataGrid(props: {
  group: string,
  plannedProducts: PlannedProductsRes,
  onItemDelete: () => void,
  onItemAdd: () => void,
}) {
  const [itemTypeName, setItemTypeName] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');

  const onDeleteItemClick = async (typeId: number) => {
    const { status } = await axios.delete(
      `/planned_product_delete/${props.group}/${typeId}`,
    );
    if (status === 200) {
      props.onItemDelete();
    }
  };

  const onAddItemClick = async (typeName: string, quantity: number) => {
    const { status } = await axios.post(
      '/planned_product_add',
      { typeName, quantity, group: props.group },
    );
    if (status === 200) {
      props.onItemAdd();
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Product',
      width: 300,
      sortable: false,
      renderCell: params =>
        <EveIconAndName
          typeId={params.row.typeId}
          categoryId={params.row.categoryId}
          name={params.row.name}
        />,
    },
    {
      field: 'quantity',
      headerName: 'Quantity',
      width: 120,
      sortable: false,
      renderCell: params =>
        <div style={{
          color: params.row.stock >= params.row.quantity ? 'green' : 'default',
          fontWeight: params.row.stock >= params.row.quantity
            ? 'bold'
            : 'default',
        }}>
          {Math.min(params.row.stock, params.row.quantity)
            + (params.row.active > 0 ? ' (+' + params.row.active + ')' : '')
            + ' / '
            + params.row.quantity}
        </div>
    },
    {
      field: 'delete',
      headerName: 'Delete',
      width: 80,
      sortable: false,
      renderCell: params =>
        <IconButton
          color="error"
          onClick={() => onDeleteItemClick(params.row.typeId)}>
          <DeleteIcon />
        </IconButton>,
    },
  ];

  return (
    <>
      <Box sx={{ pb: 1 }}>
        <DataGrid
          hideFooter
          rows={props.plannedProducts}
          columns={columns}
          disableSelectionOnClick
          disableColumnMenu
        />
      </Box>
      <Box sx={{ pr: 2, display: 'inline-flex' }}>
        <ItemAutocomplete onInputChange={value => setItemTypeName(value)} />
      </Box>
      <Box sx={{ display: 'inline-flex', pr: 2 }}>
        <TextField
          sx={{ width: 100 }}
          label="Quantity"
          variant="standard"
          onChange={event => setItemQuantity(event.target.value)} />
      </Box>
      <Box sx={{ display: 'inline-flex' }}>
        <Button
          variant="contained"
          size="small"
          onClick={() => onAddItemClick(itemTypeName, Number(itemQuantity))}>
          Add
        </Button>
      </Box>
    </>
  );
}
