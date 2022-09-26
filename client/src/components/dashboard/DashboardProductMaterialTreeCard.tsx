import { Box, Card, CardContent, Tab, Tabs, Typography } from '@mui/material';
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

  const materialColumns: GridColDef[] = [
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

  const runColumns: GridColDef[] = [
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

  // TODO add circular progress
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
        {selectedTab === SelectedTab.MATERIALS ?
          <>
            <Typography
              style={{ display: 'inline-block' }}
              variant="h6"
              gutterBottom
            >
              Missing Materials
            </Typography>
            {data &&
              <DataGrid
                rows={data.materials}
                columns={materialColumns}
                disableSelectionOnClick
                disableColumnMenu
                experimentalFeatures={{ newEditingApi: true }}
              />
            }
          </>
          : <>
            <Typography
              style={{ display: 'inline-block' }}
              variant="h6"
              gutterBottom
            >
              Blueprint Runs
            </Typography>
            {data &&
              <DataGrid
                rows={data.blueprintRuns}
                columns={runColumns}
                disableSelectionOnClick
                disableColumnMenu
                experimentalFeatures={{ newEditingApi: true }}
              />
            }
          </>
        }
      </CardContent>
    </Card >
  );
}