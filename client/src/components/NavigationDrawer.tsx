import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import LogoutIcon from '@mui/icons-material/Logout';
import axios from 'axios';
import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { styled } from '@mui/system';

const drawerWidth = 200;

const compactListSx = {
  py: 0.5,
  '& .MuiListItemButton-root': {
    minHeight: 28,
    py: 0.25,
  },
  '& .MuiListItemText-root': {
    my: 0,
  },
};

const SmallerListItemIcon = styled(ListItemIcon)({
  minWidth: 0,
  marginRight: 12,
  '& .MuiSvgIcon-root': {
    fontSize: 20,
  },
});

type NavRoute = {
  path: string,
  label: string,
  icon: ReactNode,
  component: React.FC,
  footer?: boolean,
};

type Props = {
  routes: NavRoute[],
};

export default function NavigationDrawer(props: Props) {
  const { routes } = props;
  const navigate = useNavigate();
  const location = useLocation();
  const mainRoutes = routes.filter(route => !route.footer);
  const footerRoutes = routes.filter(route => route.footer);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        height: '100%',
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: 'border-box',
          position: 'relative',
          height: '100%',
        },
      }}>
      <Box sx={{
        height: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        flexDirection: 'column',
      }}>
        <Box sx={{ overflow: 'auto' }}>
          <List dense sx={compactListSx}>
            {mainRoutes.map(route => (
              <NavRouteListItem
                key={route.path}
                route={route}
                selected={location.pathname === route.path}
                onNavigate={navigate}
              />
            ))}
          </List>
        </Box>
        <Box>
          <List dense sx={compactListSx}>
            {footerRoutes.map(route => (
              <NavRouteListItem
                key={route.path}
                route={route}
                selected={location.pathname === route.path}
                onNavigate={navigate}
              />
            ))}
            <Divider />
            <LogoutButtonListItem />
          </List>
        </Box>
      </Box>
    </Drawer >
  );
}

function NavRouteListItem(props: {
  route: NavRoute,
  selected: boolean,
  onNavigate: (path: string) => void,
}) {
  const { route, selected, onNavigate } = props;
  return (
    <ListItem disablePadding onClick={() => onNavigate(route.path)}>
      <ListItemButton selected={selected}>
        <SmallerListItemIcon>
          {route.icon}
        </SmallerListItemIcon>
        <ListItemText primary={route.label} />
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
        <SmallerListItemIcon>
          <LogoutIcon />
        </SmallerListItemIcon>
        <ListItemText primary="Logout" />
      </ListItemButton>
    </ListItem>
  );
}