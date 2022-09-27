import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import useAxios from 'axios-hooks';
import { useState } from 'react';
import { ProductionPlanRes } from '@internal/shared';
import EveIconAndName from 'components/util/EveIconAndName';

enum SelectedTab {
  RUNS = 'RUNS',
  MATERIALS = 'MATERIALS',
};

export default function DashboardProductMaterialTreeCard() {
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

  // TODO add copy to clipboard
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
      <Box>
        <Typography
          style={{ display: 'inline-block' }}
          variant="h6"
          gutterBottom
        >
          Missing Materials
        </Typography>
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