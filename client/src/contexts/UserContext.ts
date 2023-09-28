import React from 'react';

type UserContextType = {
  character_ids: number[],
  character_names: string[],
  is_logged_in: boolean,
};

export const defaultUserContextValue: UserContextType = {
  character_ids: [],
  character_names: [],
  is_logged_in: false,
};

export const UserContext = React.createContext(defaultUserContextValue);

