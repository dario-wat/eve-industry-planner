import { Box, Card, CardContent, CircularProgress } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { formatDistanceToNowStrict } from "date-fns";
import { useLocalhostAxios } from "lib/util";

const activityColors: { [key: string]: string } = {
  'Manufacturing': 'orange',
  'TE Research': 'blue',
  'ME Research': 'blue',
};

// TODO
//  - Styling (colors), maybe background color is better
//  - Add progress bar for percentage
//  - Add icons
//  - Add reactions
export default function IndustryJobsPage() {
  const [{ data }] = useLocalhostAxios('/industry_jobs');

  const indexedData =
    data && data.map((d: any, i: number) => ({ id: i, ...d }));

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
      width: 150,
      valueFormatter: params => formatDistanceToNowStrict(
        new Date(params.value),
        { addSuffix: true },
      ),
    },
    {
      field: 'blueprint_name',
      headerName: 'Blueprint',
      width: 300,
      sortable: false,
    },
    {
      field: 'progress',
      headerName: 'Progress',
      width: 100,
      sortable: false,
      valueFormatter: params => Math.round(params.value * 100) + '%',
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
      width: 160,
      sortable: false,
    },
    {
      field: 'product_name',
      headerName: 'Product',
      width: 250,
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
          {indexedData ?
            <DataGrid
              initialState={{
                sorting: {
                  sortModel: [{ field: 'end_date', sort: 'asc' }],
                },
              }}
              rows={indexedData}
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