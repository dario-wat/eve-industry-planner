import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
// import EVESSO from 'lib/eve_sso/evesso';

// TODO cleanup this mess
import eveLoginImage from 'assets/eve-sso-login-white-small.png';

const CLIENT_ID = '6b7c7e9f780c4741ab6fa8a92b2ddcdf'
const SECRET = 'ngMLJRdpTRTyE1QCNBazMfJbjzZs8mInpR8Jpq3g'
// TODO will be updated in the future
const CALLBACK_URI = 'https://localhost:3000/callback'

// TODO update icon, name and login
// TODO change the eve login part so that it actually logs in
export default function HomePageAppBar() {
  // const sso = new EVESSO(CLIENT_ID, SECRET, CALLBACK_URI, {
  //   endpoint: 'https://login.eveonline.com', // optional, defaults to this
  //   userAgent: 'my-user-agent' // optional
  // })

  // // // // 'esi-characters.read_blueprints.v1'
  // console.log(sso.getRedirectUrl('bullshit'));
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            size="small"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Eve Industry Planner
          </Typography>
          <img src={eveLoginImage} alt="Eve login" />
        </Toolbar>
      </AppBar>
    </Box>
  );
}
