import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import LogoutIcon from '@mui/icons-material/Logout';
import CachedIcon from '@mui/icons-material/Cached';
import { withStyles } from '@material-ui/styles';
import axios from 'axios';
import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const drawerWidth = 220;

const SmallerListItemIcon = withStyles({
  root: {
    minWidth: 0,
    marginRight: 16,
  },
})(ListItemIcon);

type Props = {
  routes: {
    path: string,
    label: string,
    icon: ReactNode,
    component: React.FC,
  }[],
};

export default function NavigationDrawer(props: Props) {
  const { routes } = props;
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}>
      <Toolbar /> {/* need this to push the nav bar below the app bar */}
      <Box sx={{
        height: '90vh',
        display: 'flex',
        justifyContent: 'space-between',
        flexDirection: 'column',
      }}>
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {routes.map(route => (
              <ListItem
                key={route.path}
                disablePadding
                onClick={_ => navigate(route.path)}>
                <ListItemButton selected={location.pathname === route.path}>
                  <SmallerListItemIcon>
                    {route.icon}
                  </SmallerListItemIcon>
                  <ListItemText primary={route.label} />
                </ListItemButton>
              </ListItem>
            ))}
            <Divider />
            <ClearCacheButtonListItem />
          </List>
        </Box>
        <Box>
          <List>
            <LogoutButtonListItem />
          </List>
        </Box>
      </Box>
    </Drawer >
  );
}

function ClearCacheButtonListItem() {
  const onClearCacheClick = async () => {
    const { status } = await axios.delete('/clear_cache');
    if (status === 200) {
      window.location.reload();
    }
  };
  return (
    <ListItem key="clearCache" disablePadding>
      <ListItemButton onClick={onClearCacheClick}>
        <SmallerListItemIcon>
          <CachedIcon />
        </SmallerListItemIcon>
        <ListItemText primary="Clear Cache" />
      </ListItemButton>
    </ListItem>
  );
}

function LogoutButtonListItem() {
  const onLogoutClick = async () => {
    const { status } = await axios.delete('/logout');
    if (status === 200) {
      window.location.reload();
    }
  };
  return (
    <ListItem key="logout" disablePadding>
      <ListItemButton onClick={onLogoutClick}>
        <ListItemIcon>
          <LogoutIcon />
        </ListItemIcon>
        <ListItemText primary="Logout" />
      </ListItemButton>
    </ListItem>
  );
}