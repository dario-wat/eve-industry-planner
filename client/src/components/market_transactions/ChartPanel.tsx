import { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

export default function ChartPanel(props: { title: string; children: ReactNode }) {
  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        p: 1,
        minWidth: 0,
        height: '100%',
      }}
    >
      <Typography variant="subtitle2" sx={{ width: 'fit-content', mb: 0.5 }}>
        {props.title}
      </Typography>
      {props.children}
    </Box>
  );
}
