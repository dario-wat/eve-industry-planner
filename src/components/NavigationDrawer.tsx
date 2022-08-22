import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { ReactNode } from 'react';

const drawerWidth = 240;

type Props = {
  tabs: { key: string, label: string, icon: ReactNode }[],
  selectedTab: string,
  onClick: (selectedTab: string) => void,
};

export default function NavigationDrawer(props: Props) {
  const { tabs, selectedTab, onClick } = props;
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
      }}>
      <Toolbar /> {/* need this to push the nav bar below the app bar */}
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {tabs.map(tab => (
            <ListItem key={tab.key} disablePadding onClick={_ => onClick(tab.key)}>
              <ListItemButton selected={tab.key === selectedTab}>
                <ListItemIcon>
                  {tab.icon}
                </ListItemIcon>
                <ListItemText primary={tab.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}