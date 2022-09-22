import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import LogoutIcon from '@mui/icons-material/Logout';
import axios from 'axios';
import { ReactNode, useContext } from 'react';
import { uniqueId } from 'underscore';
import useAxios from 'axios-hooks';
import { EvePortraitRes } from '@internal/shared';
import { UserContext } from 'contexts/UserContext';

const drawerWidth = 240;

type Props = {
  tabs: { key: string, label: string, icon: ReactNode }[],
  selectedTab: string,
  onTabClick: (selectedTab: string) => void,
};

export default function NavigationDrawer(props: Props) {
  const { tabs, selectedTab, onTabClick } = props;
  const [{ data: portrait }] = useAxios<EvePortraitRes>('/portrait');

  const userContext = useContext(UserContext);

  const onLogoutClick = async () => {
    const { status } = await axios.delete('/logout');
    if (status === 200) {
      window.location.reload();
    }
  };
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
            {tabs.map(tab => (
              <ListItem
                key={tab.key}
                disablePadding
                onClick={_ => onTabClick(tab.key)}>
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
        <Box>
          <List>
            <ListItem key={uniqueId()} disablePadding>
              <ListItemButton>
                <ListItemIcon>
                  <ListItemAvatar>
                    <Avatar
                      alt=""
                      src={portrait?.px64x64}
                      sx={{ width: 36, height: 36 }} />
                  </ListItemAvatar>
                </ListItemIcon>
                <ListItemText primary={userContext.character_name} />
              </ListItemButton>
            </ListItem>
            <ListItem key={uniqueId()} disablePadding>
              <ListItemButton onClick={onLogoutClick}>
                <ListItemIcon>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Box>
    </Drawer>
  );
}