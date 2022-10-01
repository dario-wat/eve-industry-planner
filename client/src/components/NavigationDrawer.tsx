import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import LogoutIcon from '@mui/icons-material/Logout';
import CachedIcon from '@mui/icons-material/Cached';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { withStyles } from '@material-ui/styles';
import axios from 'axios';
import { ReactNode, useContext, useState } from 'react';
import useAxios from 'axios-hooks';
import { uniqueId } from 'underscore';
import { EvePortraitRes } from '@internal/shared';
import { UserContext } from 'contexts/UserContext';

const drawerWidth = 220;

const SmallerListItemIcon = withStyles({
  root: {
    minWidth: 0,
    marginRight: 16,
  },
})(ListItemIcon);

type Props = {
  tabs: { key: string, label: string, icon: ReactNode }[],
  selectedTab: string,
  onTabClick: (selectedTab: string) => void,
};

export default function NavigationDrawer(props: Props) {
  const { tabs, selectedTab, onTabClick } = props;

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
                  <SmallerListItemIcon>
                    {tab.icon}
                  </SmallerListItemIcon>
                  <ListItemText primary={tab.label} />
                </ListItemButton>
              </ListItem>
            ))}
            <Divider />
            <ClearCacheButtonListItem />
          </List>
        </Box>
        <Box>
          <List>
            <LoggedInUserButtonListItem />
            <LogoutButtonListItem />
          </List>
        </Box>
      </Box>
    </Drawer>
  );
}

function LoggedInUserButtonListItem() {
  const [{ data: portrait }] = useAxios<EvePortraitRes>('/portrait');
  const [{ data: linkedCharacters }] = useAxios<string[]>('/linked_characters');
  const userContext = useContext(UserContext);

  const [openList, setOpenList] = useState(false);
  return (
    <>
      <Collapse in={openList} timeout="auto" unmountOnExit>
        {linkedCharacters && linkedCharacters.map(c =>
          <ListItem key={uniqueId()}>
            <ListItemText primary={c} />
          </ListItem>
        )}
      </Collapse>
      <ListItem key="loggedInUser" disablePadding>
        <ListItemButton onClick={() => setOpenList(!openList)}>
          <ListItemAvatar>
            <Avatar
              alt=""
              src={portrait?.px64x64}
              sx={{ width: 36, height: 36 }} />
          </ListItemAvatar>
          <ListItemText primary={userContext.character_name} />
          {openList ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
      </ListItem>
    </>
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