import useAxios from 'axios-hooks';
import HomePage from 'components/homepage/HomePage';
import { defaultUserContextValue, UserContext } from 'contexts/UserContext';
import { EveLoggedInUserRes } from '@internal/shared';
import { Box, CircularProgress } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import { RecoilRoot } from 'recoil';

const BASE_PATH = '/eve-industry-planner';

function App() {
  const [{ data, loading }] = useAxios<EveLoggedInUserRes>('/logged_in_user');
  const userContext = data
    ? {
      ...data,
      is_logged_in: data.character_ids.length > 0,
    }
    : defaultUserContextValue;

  return (
    <RecoilRoot>
      <UserContext.Provider value={userContext}>
        {/* This matches the github pages base url */}
        <BrowserRouter basename={BASE_PATH}>
          {loading
            ?
            <Box
              sx={{ height: '100vh', width: 1 }}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <CircularProgress />
            </Box>
            :
            <HomePage />}
        </BrowserRouter>
      </UserContext.Provider>
    </RecoilRoot>
  );
}

export default App;
