import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** Scroll the page. List pages leave this off and let a grid fill the height. */
  scroll?: boolean;
};

export default function WorkspacePage({ children, scroll = false }: Props) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        pt: 0.75,
        overflow: scroll ? 'auto' : 'hidden',
      }}
    >
      {children}
    </Box>
  );
}

/** Leftover viewport under the page's filters or tabs. */
export function WorkspaceFill({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** Title plus grid, one framed block on the grey page. */
export function WorkspaceSection(props: {
  title: ReactNode;
  children: ReactNode;
  /** Grow into the leftover viewport. Off on scrolling pages, where the content sets the height. */
  fill?: boolean;
}) {
  const { fill = true } = props;
  return (
    <Box
      sx={{
        flex: fill ? 1 : 'none',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
        '& .MuiDataGrid-root': {
          border: 0,
        },
      }}
    >
      <Typography
        variant="subtitle2"
        component="div"
        sx={{
          flexShrink: 0,
          px: 1,
          py: 0.75,
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200'),
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {props.title}
      </Typography>
      {fill ? <WorkspaceFill>{props.children}</WorkspaceFill> : props.children}
    </Box>
  );
}

export function WorkspaceSpinner() {
  return (
    <Box
      sx={{
        flex: 1,
        height: '100%',
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CircularProgress />
    </Box>
  );
}
