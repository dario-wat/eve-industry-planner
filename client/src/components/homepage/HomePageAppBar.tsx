import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import ExtensionIcon from '@mui/icons-material/Extension';
import EveLoginButton from 'components/homepage/EveLoginButton';
import LoggedInUserCard from 'components/homepage/LoggedInUserCard';
import { Box } from '@mui/material';

// TODO
// - figure out placement of buttons
export default function HomePageAppBar() {
  return (
    <AppBar
      position="fixed"
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <ExtensionIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div"
          sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}>
          Eve Industry Planner
        </Typography>
        <Box sx={{ pr: 2 }}>
          <LoggedInUserCard />
        </Box>
        <EveLoginButton />
      </Toolbar>
    </AppBar >
  );
}