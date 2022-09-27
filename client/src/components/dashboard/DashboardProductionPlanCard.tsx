import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import useAxios from 'axios-hooks';
import { useState } from 'react';
import { ProductionPlanRes } from '@internal/shared';
import EveIconAndName from 'components/util/EveIconAndName';
import { LoadingButton } from '@mui/lab';

enum SelectedTab {
  RUNS = 'RUNS',
  MATERIALS = 'MATERIALS',
};

export default function DashboardProductionPlanCard() {
  const [{ data }] = useAxios<ProductionPlanRes>('/production_plan');

  const [selectedTab, setSelectedTab] = useState(SelectedTab.RUNS);

  return (
    <Card>
      <CardContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
          <Tabs
            value={selectedTab}
            onChange={(_, newValue) => setSelectedTab(newValue)}
          >
            <Tab label="Runs" value={SelectedTab.RUNS} />
            <Tab label="Materials" value={SelectedTab.MATERIALS} />
          </Tabs>
        </Box>
        {selectedTab === SelectedTab.MATERIALS
          ? <MaterialsTab data={data} />
          : <BlueprintRunsTab data={data} />
        }
      </CardContent>
    </Card >
  );
}

function MaterialsTab(props: {
  data: ProductionPlanRes | undefined,
}) {
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Material',
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
      width: 100,
      sortable: false,
    },
  ];

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1 }}>
        <Typography
          style={{ display: 'inline-block' }}
          variant="h6"
          gutterBottom
        >
          Missing Materials
        </Typography>
        <LoadingButton
          loading={props.data === undefined}
          variant="contained"
          size="small"
          onClick={() => {
            navigator.clipboard.writeText(
              props.data!.materials
                .map(m => m.name + ' ' + m.quantity)
                .join('\r\n')
            );
            setSnackbarOpen(true);
          }}>
          Copy
        </LoadingButton>
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={3000}
          message="Copied!"
          onClose={() => setSnackbarOpen(false)}
          action={
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={() => setSnackbarOpen(false)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        />
      </Box>
      {props.data ?
        <DataGrid
          rows={props.data.materials}
          columns={columns}
          disableSelectionOnClick
          disableColumnMenu
          experimentalFeatures={{ newEditingApi: true }}
        />
        :
        <Box
          sx={{ height: 'auto', width: '100%' }}
          display="flex"
          justifyContent="center"
          alignItems="center">
          <CircularProgress />
        </Box>
      }
    </>
  );
}

function BlueprintRunsTab(props: {
  data: ProductionPlanRes | undefined,
}) {
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Material',
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
      field: 'runs',
      headerName: 'Runs',
      width: 100,
      sortable: false,
    },
  ];

  return (
    <>
      <Box>
        <Typography
          style={{ display: 'inline-block' }}
          variant="h6"
          gutterBottom
        >
          Blueprint Runs
        </Typography>
      </Box>
      {props.data
        ?
        <DataGrid
          rows={props.data.blueprintRuns}
          columns={columns}
          disableSelectionOnClick
          disableColumnMenu
          experimentalFeatures={{ newEditingApi: true }}
        />
        :
        <Box
          sx={{ height: 'auto', width: '100%' }}
          display="flex"
          justifyContent="center"
          alignItems="center">
          <CircularProgress />
        </Box>
      }
    </>
  );
}