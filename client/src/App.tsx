import useAxios from 'axios-hooks';
import { Provider } from 'react-redux';
import HomePage from 'components/homepage/HomePage';
import { defaultUserContextValue, UserContext } from 'contexts/UserContext';
import store from 'redux/store';
import { EveLoggedInUserRes } from '@internal/shared';

function App() {
  // TODO(EIP-7) is this the right way?
  // TODO properly gate logged in user content. Have a separate page
  // that is gated by whether the user is logged in or not
  const [{ data }] = useAxios<EveLoggedInUserRes>('/logged_in_user');
  const userContext = data
    ? {
      ...data,
      is_logged_in: data.character_id !== null,
    }
    : defaultUserContextValue;
  return (
    <Provider store={store}>
      <UserContext.Provider value={userContext}>
        <HomePage />
      </UserContext.Provider>
    </Provider>
  );
}

export default App;
