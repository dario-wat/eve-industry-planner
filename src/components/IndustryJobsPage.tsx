import { Box, Card, CardContent, CircularProgress } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useLocalhostAxios } from "lib/util";

export default function IndustryJobsPage() {
  const [{ data }] = useLocalhostAxios('/industry_jobs');

  const indexedData =
    data && data.map((d: any, i: number) => ({ id: i, ...d }));

  const columns: GridColDef[] = [
    {
      field: 'activity',
      headerName: 'Activity',
      width: 150,
      sortable: false,
    },
    {
      field: 'blueprint_name',
      headerName: 'Blueprint',
      width: 150,
      sortable: false,
    },
    {
      field: 'progress',
      headerName: 'Progress',
      width: 150,
      sortable: false,
    },
    {
      field: 'remaining_time',
      headerName: 'Remaining Time',
      width: 150,
      sortable: false,
    },
    {
      field: 'runs',
      headerName: 'Runs',
      width: 150,
      sortable: false,
    },
    {
      field: 'location',
      headerName: 'Location',
      width: 150,
      sortable: false,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 150,
      sortable: false,
    },
    {
      field: 'product_name',
      headerName: 'Product',
      width: 150,
      sortable: false,
    },
  ];

  return <Card>
    <CardContent>
      {indexedData ?
        <Box sx={{ height: 'auto', width: '100%' }}>
          <DataGrid
            autoHeight
            density="compact"
            rows={indexedData}
            columns={columns}
            pageSize={100}
            rowsPerPageOptions={[100]}
            disableSelectionOnClick
            disableColumnMenu
            experimentalFeatures={{ newEditingApi: true }}
          />
        </Box>
        : <CircularProgress />
      }
    </CardContent>
  </Card>;
}