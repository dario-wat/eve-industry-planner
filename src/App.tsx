import useAxios from 'axios-hooks';
import { Provider } from 'react-redux';
import HomePage from 'components/homepage/HomePage';
import { UserContext } from 'components/homepage/UserContext';
import store from 'redux/store';

function App() {
  // TODO(EIP-7) is this the right way?
  const [{ data }] = useAxios('/logged_in_user');
  return (
    <Provider store={store}>
      <UserContext.Provider value={data}>
        <HomePage />
      </UserContext.Provider>
    </Provider>
  );
}

export default App;
