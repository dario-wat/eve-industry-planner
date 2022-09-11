import { Card, CardContent } from '@mui/material';
import TreeView from '@mui/lab/TreeView';
import TreeItem from '@mui/lab/TreeItem';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import useAxios from 'axios-hooks';
import { ManufactureTreeRes } from '@internal/shared';

export default function DashboardProductMaterialTreeCard() {
  const [{ data }] = useAxios('/planned_products_material_tree');

  const renderTree = (node: ManufactureTreeRes) => (
    <TreeItem
      key={node.type_id}
      nodeId={node.type_id.toString()}
      label={node.name + ' - ' + node.quantity}
    >
      {node.materials.map((node) => renderTree(node))}
    </TreeItem>
  );

  return (
    <Card>
      <CardContent>
        <TreeView
          defaultCollapseIcon={<ExpandMoreIcon />}
          defaultExpandIcon={<ChevronRightIcon />}
          sx={{ height: 600, flexGrow: 1, maxWidth: 500, overflowY: 'auto' }}
        >
          {data && data.map(renderTree)}
        </TreeView>
      </CardContent>
    </Card >
  );
}