import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import ExtensionIcon from '@mui/icons-material/Extension';
import EveLoginButton from 'components/homepage/EveLoginButton';

export default function HomePageAppBar() {
  return (
    <AppBar position="static">
      <Toolbar variant="dense" sx={{ justifyContent: 'space-between', py: 0 }}>
        <ExtensionIcon sx={{ mr: 1.5, fontSize: 24 }} />
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 1, fontSize: '1.1rem', display: { xs: 'none', sm: 'block' } }}
        >
          Eve Industry Planner
        </Typography>
        <EveLoginButton />
      </Toolbar>
    </AppBar>
  );
}
