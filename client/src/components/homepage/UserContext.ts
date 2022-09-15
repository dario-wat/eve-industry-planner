import React from 'react';

type UserContextType = {
  character_id: number | null,
  character_name: string | null,
  is_logged_in: boolean,
};

export const defaultUserContextValue: UserContextType = {
  character_id: null,
  character_name: null,
  is_logged_in: false,
};

export const UserContext = React.createContext(defaultUserContextValue);

