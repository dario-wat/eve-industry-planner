import useAxios from 'axios-hooks';
import { Provider } from 'react-redux';
import HomePage from 'components/homepage/HomePage';
import { defaultUserContextValue, UserContext } from 'contexts/UserContext';
import store from 'redux/store';
import { EveLoggedInUserRes } from '@internal/shared';
import { Box, CircularProgress, Toolbar } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';

function App() {
  const [{ data, loading }] = useAxios<EveLoggedInUserRes>('/logged_in_user');
  const userContext = data
    ? {
      ...data,
      is_logged_in: data.character_id !== null,
    }
    : defaultUserContextValue;

  return (
    <Provider store={store}>
      <UserContext.Provider value={userContext}>
        <BrowserRouter>
          {loading
            ?
            <Box sx={{ height: 300, width: 1 }}>
              <Toolbar /> {/* need this to push the nav bar below the app bar */}
              <Box
                sx={{ height: '100%', width: 1 }}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <CircularProgress />
              </Box>
            </Box>
            :
            <HomePage />}
        </BrowserRouter>
      </UserContext.Provider>
    </Provider>
  );
}

export default App;
