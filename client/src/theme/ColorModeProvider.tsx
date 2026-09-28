import { CssBaseline, ThemeProvider } from '@mui/material';
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import createAppTheme, { COLOR_MODE_STORAGE_KEY, ColorMode } from 'theme/createAppTheme';

type ColorModeContextValue = {
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
};

const ColorModeContext = createContext<ColorModeContextValue>({
  mode: 'light',
  setMode: () => {},
});

export function useColorMode() {
  return useContext(ColorModeContext);
}

function readStoredMode(): ColorMode {
  try {
    return localStorage.getItem(COLOR_MODE_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export default function ColorModeProvider(props: { children: ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>(readStoredMode);
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const value = useMemo(() => ({
    mode,
    setMode: (next: ColorMode) => {
      try {
        localStorage.setItem(COLOR_MODE_STORAGE_KEY, next);
      } catch {
        // Preference still applies for this session if storage is blocked.
      }
      setModeState(next);
    },
  }), [mode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {props.children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
