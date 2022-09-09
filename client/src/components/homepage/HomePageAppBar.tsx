import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import ExtensionIcon from '@mui/icons-material/Extension';
import EveLoginButton from 'components/homepage/EveLoginButton';

export default function HomePageAppBar() {
  return (
    <AppBar
      position="fixed"
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <ExtensionIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Eve Industry Planner
        </Typography>
        <EveLoginButton />
      </Toolbar>
    </AppBar>
  );
}
