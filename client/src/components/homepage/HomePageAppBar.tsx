import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import ExtensionIcon from '@mui/icons-material/Extension';
import { useContext } from 'react';
import EveLoginButton from 'components/homepage/EveLoginButton';
import { UserContext } from './UserContext';
import { Box } from '@mui/material';

// TODO
// - add a nice button for character
export default function HomePageAppBar() {
  const userContext = useContext(UserContext);
  return (
    <AppBar
      position="fixed"
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <ExtensionIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Eve Industry Planner
        </Typography>
        <Box>
          {userContext && userContext.character_name}
          <EveLoginButton />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
