import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
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
import { first, groupBy } from 'underscore';
import EveIconAndName from 'components/util/EveIconAndName';
import DashboardProductsDataGrid from './products_card/DashboardProductsDataGrid';

const ADD_TAB = 'add_tab';

export default function DashboardProductsCard() {
  const [{ data, loading }, refetch] =
    useAxios<PlannedProductsRes>('/planned_products');

  const [groupedPlannedProducts, setGroupedPlannedProducts] =
    useState<{ [group: string]: PlannedProductsRes }>({});
  useEffect(() =>
    setGroupedPlannedProducts(groupBy(data ?? [], pp => pp.group)),
    [data],
  );

  const [selectedTab, setSelectedTab] = useState(ADD_TAB);
  useEffect(
    () => setSelectedTab(first(Object.keys(groupedPlannedProducts)) || ADD_TAB),
    [groupedPlannedProducts],
  );

  const dispatch = useAppDispatch();
  const onChange = () => {
    refetch();
    dispatch(fetchProductionPlan());
  };

  return (
    <Card sx={{ height: 'auto' }}>
      <CardContent>
        <Typography
          style={{ display: 'inline-block' }}
          variant="h6"
          gutterBottom
        >
          Products
        </Typography>
        {loading
          ?
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center">
            <CircularProgress />
          </Box>
          :
          <>
            <Box sx={{
              borderBottom: 1,
              borderColor: 'divider',
              mb: 1,
              display: 'flex',
            }}>
              <Tabs
                value={selectedTab}
                onChange={(_, newValue) => setSelectedTab(newValue)}>
                {Object.keys(groupedPlannedProducts).map(group =>
                  <Tab label={group} value={group} key={group} />
                )}
                <Tab icon={<AddIcon />} value={ADD_TAB} />
              </Tabs>
            </Box>
            {selectedTab !== ADD_TAB
              ?
              <DashboardProducts
                group={selectedTab}
                plannedProducts={groupedPlannedProducts[selectedTab]}
                onItemChange={onChange}
                onGroupDelete={onChange}
                onUpdate={pps => setGroupedPlannedProducts(
                  gpps => ({ ...gpps, [selectedTab]: pps }))
                } />
              :
              <NewGroupTab onUpdate={(pps, group) => setGroupedPlannedProducts(
                gpps => ({ ...gpps, [group]: pps }))
              } />
            }
          </>
        }
      </CardContent>
    </Card>
  );
}

function DashboardProducts(props: {
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

function NewGroupTab(props: {
  onUpdate: (plannedProducts: PlannedProductsRes, group: string) => void,
}) {
  const [name, setName] = useState('');
  return (
    <>
      <Box sx={{ pb: 2 }}>
        <TextField
          label="Group Name"
          variant="outlined"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </Box>
      <DashboardProductsTextArea
        group={name}
        plannedProducts={[]}
        onUpdate={pps => props.onUpdate(pps, name)} />
    </>
  );
}



function DashboardProductsTextArea(
  props: {
    group: string,
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
      { text, group: props.group },
    );

    const errors = filterNullOrUndef(data.map(pp => pp.error));
    if (errors.length === 0) {
      // Update only when no errors
      props.onUpdate(data.map(pp => ({
        name: pp.name,
        typeId: pp.typeId!,
        group: pp.group!,
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