import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DeleteIcon from '@mui/icons-material/Delete';
import { withStyles } from '@material-ui/styles';
import LoadingButton from '@mui/lab/LoadingButton';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import useAxios from 'axios-hooks';
import { useEffect, useState } from 'react';
import { filterNullOrUndef, PlannedProductsRes, PlannedProductsWithErrorRes } from '@internal/shared';
import { useAppDispatch } from 'redux/hooks';
import axios from 'axios';
import { fetchProductionPlan } from 'redux/slices/productionPlanSlice';
import { first } from 'underscore';
import EveIconAndName from 'components/util/EveIconAndName';

export default function DashboardProductsCard() {
  const [{ data, loading }, refetch] = useAxios<PlannedProductsRes>('/planned_products');

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
          ?
          <DashboardProductsDataGrid
            plannedProducts={plannedProducts}
            loading={loading}
            onItemDelete={_ => refetch()} />
          :
          <DashboardProductsTextArea
            plannedProducts={plannedProducts}
            onUpdate={pps => {
              setPlannedProducts(pps);
              setUseGrid(true);
            }} />
        }
      </CardContent>
    </Card>
  );
}

function DashboardProductsDataGrid(
  props: {
    plannedProducts: PlannedProductsRes,
    loading: boolean,
    onItemDelete: (typeId: number) => void,
  }
) {
  const onDeleteClick = async (typeId: number) => {
    const { status } = await axios.delete(`/planned_product_delete/${typeId}`);
    if (status === 200) {
      props.onItemDelete(typeId);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Product',
      width: 280,
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
      width: 100,
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
          onClick={() => onDeleteClick(params.row.typeId)}
        >
          <DeleteIcon />
        </IconButton>,
    },
  ];

  return (
    <DataGrid
      loading={props.loading}
      rows={props.plannedProducts}
      columns={columns}
      disableSelectionOnClick
      disableColumnMenu
      experimentalFeatures={{ newEditingApi: true }}
    />
  );
}

function DashboardProductsTextArea(
  props: {
    plannedProducts: PlannedProductsRes,
    onUpdate: (plannedProducts: PlannedProductsRes) => void,
  }
) {
  const [text, setText] = useState('');
  useEffect(
    () => setText(
      props.plannedProducts.map(pp => pp.name + ' ' + pp.quantity).join('\n'),
    ),
    [props.plannedProducts],
  );

  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const onButtonClick = async () => {
    setIsSubmitting(true);
    const { data } = await axios.post<PlannedProductsWithErrorRes>(
      '/planned_products_recreate',
      { text },
    );

    const errors = filterNullOrUndef(data.map(pp => pp.error));
    if (errors.length === 0) {
      // Update only when no errors
      props.onUpdate(data.map(pp => ({
        name: pp.name,
        typeId: pp.typeId!,
        categoryId: pp.categoryId!,
        quantity: pp.quantity!,
        stock: pp.stock!,
        active: pp.active!,
      })));

      // Trigger new production plan
      dispatch(fetchProductionPlan());
    }
    setErrors(errors);
    setIsSubmitting(false);
  };

  const RedTextTypography = withStyles({
    root: {
      color: 'red',
    },
  })(Typography);

  return (
    <Box>
      <TextField
        sx={{ pb: 2 }}
        fullWidth
        multiline
        placeholder={
          'Each line is a separate product.\n'
          + 'Format: "product_name quantity" without quotes\n'
          + 'E.g.\n'
          + 'Nanofiber Internal Structure II 10\n'
          + '1MN Afterburner II 5\n'
          + 'Kikimora 1'
        }
        rows={15}
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <Grid container spacing={2}>
        <Grid item xs={3}>
          <LoadingButton
            loading={isSubmitting}
            variant="contained"
            onClick={onButtonClick}
          >
            Submit
          </LoadingButton>
        </Grid>
        <Grid item xs={9} sx={{ display: 'flex' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <RedTextTypography variant='body2'>
              {first(errors)}
            </RedTextTypography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}