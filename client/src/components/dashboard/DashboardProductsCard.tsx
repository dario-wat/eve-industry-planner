import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import useDeepCompareEffect from 'use-deep-compare-effect'
import { first, groupBy } from 'underscore';
import useAxios from 'axios-hooks';
import { useState } from 'react';
import { PlannedProductsRes } from '@internal/shared';
import { useAppDispatch } from 'redux/hooks';
import { fetchProductionPlan } from 'redux/slices/productionPlanSlice';
import DashboardProductsTextArea from './products_card/DashboardProductsTextArea';
import DashboardProducts from './products_card/DashboardProducts';

const ADD_TAB = 'add_tab';

export default function DashboardProductsCard() {
  const [{ data, loading }, refetch] =
    useAxios<PlannedProductsRes>('/planned_products');

  const groupedPlannedProducts = groupBy(data ?? [], pp => pp.group);
  const productGroups = Object.keys(groupedPlannedProducts);

  const [selectedTab, setSelectedTab] = useState(ADD_TAB);
  useDeepCompareEffect(
    () => setSelectedTab(first(productGroups) || ADD_TAB),
    [productGroups],
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
                {productGroups.map(group =>
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
                onGroupDelete={() => {
                  onChange();
                  setSelectedTab(ADD_TAB);  // Otherwise it will error
                }} />
              :
              <NewGroupTab onUpdate={onChange} />
            }
          </>
        }
      </CardContent>
    </Card>
  );
}

function NewGroupTab(props: {
  onUpdate: () => void,
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
        onUpdate={() => props.onUpdate()} />
    </>
  );
}



