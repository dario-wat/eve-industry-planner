import { useMemo } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { WorkspaceSection } from 'components/util/WorkspacePage';
import EChart from './EChart';
import { ScanRow, scatterPoints } from './marketHistoryScan';
import { ScanChartColors, scatterChartOption } from './scanChartOptions';

export default function ScanChartTab(props: { rows: ScanRow[]; onOpen: (typeId: number) => void }) {
  const theme = useTheme();
  const colors = useMemo<ScanChartColors>(
    () => ({
      up: alpha(theme.palette.success.main, 0.85),
      down: alpha(theme.palette.error.main, 0.85),
      flat: alpha(theme.palette.text.secondary, 0.7),
      text: theme.palette.text.primary,
      muted: theme.palette.text.secondary,
      divider: theme.palette.divider,
      paper: theme.palette.background.paper,
      fontFamily: theme.typography.fontFamily ?? 'sans-serif',
    }),
    [theme],
  );
  const points = useMemo(() => scatterPoints(props.rows), [props.rows]);
  const scatter = useMemo(
    () => (points.length === 0 ? null : scatterChartOption(points, colors)),
    [points, colors],
  );

  const openPoint = (data: unknown) => {
    const typeId = typeIdFromChartData(data);
    if (typeId != null) {
      props.onOpen(typeId);
    }
  };

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
      <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex' }}>
        <WorkspaceSection title="Liquidity and price change">
          {scatter == null ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">No price change to plot.</Typography>
            </Box>
          ) : (
            <EChart option={scatter} height="100%" onClick={openPoint} />
          )}
        </WorkspaceSection>
      </Box>
    </Box>
  );
}

function typeIdFromChartData(data: unknown): number | null {
  if (data == null || typeof data !== 'object' || !('typeId' in data)) {
    return null;
  }
  const typeId = data.typeId;
  return typeof typeId === 'number' ? typeId : null;
}
