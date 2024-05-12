import useAxios from 'axios-hooks';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { formatDistanceToNowStrict } from 'date-fns';
import { EveIndustryJobHistoryRes, EveIndustryJobsRes } from '@internal/shared';
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

const activeJobsColumns: GridColDef[] = [
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
    valueFormatter: (value: any) => formatDistanceToNowStrict(
      new Date(value),
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

const jobHistoryColumns: GridColDef[] = [
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
    field: 'category_name',
    headerName: 'Category',
    width: 150,
    sortable: true,
  },
  {
    field: 'meta',
    headerName: 'Tech Level',
    width: 100,
    sortable: true,
  },
  {
    field: 'count',
    headerName: 'Count',
    width: 100,
    sortable: true,
  },
];

export default function IndustryJobsPage() {
  const [selectedTab, setSelectedTab] = useState(SelectedTab.ACTIVE);
  return (
    <Card>
      <CardContent>
        <Tabs
          sx={{
            mb: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
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
            <ActiveJobs />
          }
          {selectedTab === SelectedTab.HISTORY &&
            <JobHistory />
          }
        </Box>
      </CardContent>
    </Card>
  );
}

function ActiveJobs() {
  const [{ data }] = useAxios<EveIndustryJobsRes>('/industry_jobs');
  const activeJobs = data?.filter(job => job.status === 'active');
  return activeJobs ?
    <DataGrid
      initialState={{
        sorting: {
          sortModel: [{ field: 'end_date', sort: 'asc' }],
        },
      }}
      rows={activeJobs}
      columns={activeJobsColumns}
      disableRowSelectionOnClick
      disableColumnMenu
    />
    : <CircularProgress />
}

function JobHistory() {
  const [{ data }] = useAxios<EveIndustryJobHistoryRes>('/industry_job_history');
  return data ?
    <DataGrid
      initialState={{
        sorting: {
          sortModel: [{ field: 'end_date', sort: 'asc' }],
        },
      }}
      rows={data}
      columns={jobHistoryColumns}
      disableRowSelectionOnClick
      disableColumnMenu
    />
    : <CircularProgress />
}