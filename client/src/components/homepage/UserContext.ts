import React from 'react';

const UserContext = React.createContext({
  character_id: null,
  character_name: null,
  is_logged_in: false,
});

export { UserContext };