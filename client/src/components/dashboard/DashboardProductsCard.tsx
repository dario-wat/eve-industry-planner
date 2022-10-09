import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import LoadingButton from '@mui/lab/LoadingButton';
import useAxios from 'axios-hooks';
import { useEffect, useState } from 'react';
import { PlannedProductsRes } from '@internal/shared';
import { useAppDispatch } from 'redux/hooks';
import axios from 'axios';
import { fetchProductionPlan } from 'redux/slices/productionPlanSlice';
import { first, groupBy } from 'underscore';
import DashboardProductsDataGrid from './products_card/DashboardProductsDataGrid';
import DashboardProductsTextArea from './products_card/DashboardProductsTextArea';

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



