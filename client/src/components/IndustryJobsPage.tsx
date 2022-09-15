import useAxios from 'axios-hooks';
import { Box, Card, CardContent, CircularProgress } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { formatDistanceToNowStrict } from 'date-fns';
import { EveIndustryJobsRes } from '@internal/shared';

const activityColors: { [key: string]: string } = {
  'Manufacturing': 'orange',
  'TE Research': 'blue',
  'ME Research': 'blue',
  'Invention': 'green',
};

// TODO
//  - Styling (colors), maybe background color is better
//  - Add progress bar for percentage
//  - Add icons
export default function IndustryJobsPage() {
  const [{ data }] = useAxios<EveIndustryJobsRes>('/industry_jobs');

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
      width: 300,
      sortable: false,
      renderCell: params => {
        if (params.row.activity === 'Manufacturing') {
          return <img src={
            `https://images.evetech.net/types/${params.row.product_type_id}/icon`} alt="BS" />;
        }
        return <img src={
          `https://images.evetech.net/types/${params.row.product_type_id}/bp`} alt="BS" />;
      },
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
      width: 80,
      sortable: false,
    },
    {
      field: 'location',
      headerName: 'Location',
      width: 200,
      sortable: false,
    },
  ];

  return (
    <Card>
      <CardContent>
        <Box
          sx={{ height: 'auto', width: '100%' }}
          display="flex"
          justifyContent="center"
          alignItems="center"
        >
          {data ?
            <DataGrid
              initialState={{
                sorting: {
                  sortModel: [{ field: 'end_date', sort: 'asc' }],
                },
              }}
              rows={data}
              columns={columns}
              disableSelectionOnClick
              disableColumnMenu
              experimentalFeatures={{ newEditingApi: true }}
            />
            : <CircularProgress />
          }
        </Box>
      </CardContent>
    </Card>
  );
}