import useAxios from 'axios-hooks';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { formatDistanceToNowStrict } from 'date-fns';
import { EveIndustryJobsRes } from '@internal/shared';
import EveIconAndName from 'components/util/EveIconAndName';
import { Tab, Tabs } from '@mui/material';
import { useState } from 'react';

const activityColors: { [key: string]: string } = {
  'Manufacturing': 'orange',
  'TE Research': 'blue',
  'ME Research': 'blue',
  'Invention': 'green',
  'Reactions': 'orange',
  'Copying': 'red',
};

enum SelectedTab {
  ACTIVE = 'ACTIVE',
  HISTORY = 'HISTORY',
};

const columns: GridColDef[] = [
  {
    field: 'activity',
    headerName: 'Activity',
    width: 130,
    renderCell: params =>
      <div style={{ color: activityColors[params.value] }}>
        {params.value}
      </div>,
  },
  {
    field: 'end_date',
    headerName: 'Remaining Time',
    width: 170,
    valueFormatter: params => formatDistanceToNowStrict(
      new Date(params.value),
      { addSuffix: true },
    ),
  },
  {
    field: 'product',
    headerName: 'Product',
    width: 320,
    sortable: false,
    renderCell: params =>
      <EveIconAndName
        typeId={params.row.product_type_id}
        categoryId={params.row.category_id}
        name={params.row.product_name}
      />,
  },
  {
    field: 'progress',
    headerName: 'Progress',
    width: 100,
    sortable: false,
    renderCell: params =>
      <div style={{ color: params.value === 1 ? 'green' : 'default' }}>
        {Math.round(params.value * 100) + '%'}
      </div>,
  },
  {
    field: 'runs',
    headerName: 'Runs',
    width: 70,
    sortable: false,
  },
  {
    field: 'location',
    headerName: 'Location',
    width: 200,
    sortable: false,
  },
  {
    field: 'character_name',
    headerName: 'Character',
    width: 200,
    sortable: false,
  },
];

export default function IndustryJobsPage() {
  const [{ data }] = useAxios<EveIndustryJobsRes>('/industry_jobs');
  const activeJobs = data?.filter(job => job.status === 'active');
  const finishedJobs = data?.filter(job => job.status === 'delivered');

  const [selectedTab, setSelectedTab] = useState(SelectedTab.ACTIVE);
  return (
    <Card>
      <CardContent>
        <Tabs
          value={selectedTab}
          onChange={(_, newValue) => setSelectedTab(newValue)}
        >
          <Tab label="Active" value={SelectedTab.ACTIVE} />
          <Tab label="History" value={SelectedTab.HISTORY} />
        </Tabs>
        <Box
          sx={{ height: 'auto', width: '100%' }}
          display="flex"
          justifyContent="center"
          alignItems="center"
        >
          {selectedTab === SelectedTab.ACTIVE &&
            <ActiveJobs activeJobs={activeJobs} />
          }
          {selectedTab === SelectedTab.HISTORY &&
            <JobHistory finishedJobs={finishedJobs} />
          }
        </Box>
      </CardContent>
    </Card>
  );
}

function ActiveJobs(
  { activeJobs }: { activeJobs: EveIndustryJobsRes | undefined }
) {
  return activeJobs ?
    <DataGrid
      initialState={{
        sorting: {
          sortModel: [{ field: 'end_date', sort: 'asc' }],
        },
      }}
      rows={activeJobs}
      columns={columns}
      disableSelectionOnClick
      disableColumnMenu
      experimentalFeatures={{ newEditingApi: true }}
    />
    : <CircularProgress />
}

// TODO this should be sum of all manufacture jobs
// maybe other job types as well
// also should store this similar to wallet transactions
function JobHistory(
  { finishedJobs }: { finishedJobs: EveIndustryJobsRes | undefined }
) {
  return finishedJobs ?
    <DataGrid
      initialState={{
        sorting: {
          sortModel: [{ field: 'end_date', sort: 'asc' }],
        },
      }}
      rows={finishedJobs}
      columns={columns}
      disableSelectionOnClick
      disableColumnMenu
      experimentalFeatures={{ newEditingApi: true }}
    />
    : <CircularProgress />
}