import { Card, CardContent } from '@mui/material';
import TreeView from '@mui/lab/TreeView';
import TreeItem from '@mui/lab/TreeItem';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import useAxios from 'axios-hooks';
import { ProductionPlanRes } from '@internal/shared';
import { uniqueId } from 'underscore';

export default function DashboardProductMaterialTreeCard() {
  const [{ data }] = useAxios<ProductionPlanRes>('/production_plan');

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Material',
      width: 300,
      sortable: false,
    },
    {
      field: 'quantity',
      headerName: 'Quantity',
      width: 100,
      sortable: false,
    },
  ];

  // TODO add circular progress
  return (
    <Card>
      <CardContent>
        {data &&
          <DataGrid
            rows={data.materials}
            columns={columns}
            disableSelectionOnClick
            disableColumnMenu
            experimentalFeatures={{ newEditingApi: true }}
          />
        }
      </CardContent>
    </Card >
  );
}