import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { LoadingButton } from '@mui/lab';
import { groupBy, uniqueId } from 'underscore';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { ProductionPlanRes } from '@internal/shared';
import EveIconAndName from 'components/util/EveIconAndName';
import useProductionPlanState from './useProductionPlanState';
import { formatNumber } from 'components/util/numbers';

enum SelectedTab {
  RUNS = 'RUNS',
  MATERIALS = 'MATERIALS',
};

export default function DashboardProductionPlanCard() {
  const { productionPlan, fetchProductionPlan } = useProductionPlanState();

  useEffect(
    () => {
      fetchProductionPlan();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [selectedTab, setSelectedTab] = useState(SelectedTab.RUNS);

  const [refreshingAssets, setRefreshingAssets] = useState(false);
  const onRefreshAssetsClick = async () => {
    setRefreshingAssets(true);
    const { status } = await axios.delete('/clear_assets_cache');
    if (status === 200) {
      await fetchProductionPlan();
    }
    setRefreshingAssets(false);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 1,
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <Tabs
            value={selectedTab}
            onChange={(_, newValue) => setSelectedTab(newValue)}
          >
            <Tab label="Runs" value={SelectedTab.RUNS} />
            <Tab label="Materials" value={SelectedTab.MATERIALS} />
          </Tabs>
          <LoadingButton
            sx={{ height: '40px' }}
            loading={refreshingAssets}
            variant="contained"
            size="small"
            onClick={onRefreshAssetsClick}>
            Refresh Assets
          </LoadingButton>
        </Box>
        {selectedTab === SelectedTab.MATERIALS
          ? <MaterialsTab
            data={productionPlan.value}
            loading={productionPlan.loading}
          />
          : <BlueprintRunsTab
            data={productionPlan.value}
            loading={productionPlan.loading}
          />
        }
      </CardContent>
    </Card >
  );
}

function MaterialsTab(props: {
  data: ProductionPlanRes,
  loading: boolean,
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
      valueFormatter: value => !value ? '-' : formatNumber(value, 0),
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
          loading={props.loading}
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
      {!props.loading
        ?
        <DataGrid
          rows={props.data.materials}
          columns={columns}
          disableRowSelectionOnClick
          disableColumnMenu
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
  data: ProductionPlanRes,
  loading: boolean,
}) {
  const groupedData = groupBy(props.data.blueprintRuns, 'productionCategory');

  const columns: (headerName: string) => GridColDef[] = headerName => [
    {
      field: 'name',
      headerName,
      width: 300,
      sortable: false,
      renderCell: params =>
        <Box sx={{
          color: params.row.blueprintExists ? 'default' : 'red',
          display: 'contents',
        }}>
          <EveIconAndName
            typeId={params.row.typeId}
            categoryId={params.row.categoryId}
            name={params.row.name}
          />
        </Box>,
    },
    {
      field: 'runs',
      headerName: 'Runs',
      width: 100,
      sortable: false,
      renderCell: params => params.row.activeRuns
        ? <div style={{ color: 'green', fontWeight: 'bold' }}>
          {params.row.activeRuns + ' / ' + params.row.runs}
        </div>
        : params.row.runs,
    },
    {
      field: 'daysToRun',
      headerName: 'Days',
      width: 70,
      align: 'right',
      sortable: false,
      valueFormatter: (value: any) => value.toFixed(1),
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
      {!props.loading
        ?
        Object.entries(groupedData).map(d =>
          <DataGrid
            key={uniqueId()}
            rows={d[1]}
            columns={columns(d[0])}
            disableRowSelectionOnClick
            disableColumnMenu
            hideFooter
          />
        )
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