import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import useAxios from 'axios-hooks';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { LambdaJobRunRes, LambdaJobsRes } from '@internal/shared';
import { useState } from 'react';
import WorkspacePage, { WorkspaceSection, WorkspaceSpinner } from 'components/util/WorkspacePage';

type JobRow = LambdaJobsRes[number] & { id: string };

const jobColumns: GridColDef<JobRow>[] = [
  { field: 'label', headerName: 'Job', width: 240 },
  { field: 'scheduleLabel', headerName: 'Schedule', width: 220 },
  {
    field: 'lastRun',
    headerName: 'Last run',
    width: 160,
    sortable: false,
    valueGetter: (_value, row) => {
      const latest = row.runs[0];
      if (latest === undefined) {
        return '';
      }
      return formatDistanceToNowStrict(new Date(latest.time), { addSuffix: true });
    },
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 130,
    sortable: false,
    renderCell: params => <StatusChip run={params.row.runs[0]} />,
  },
  {
    field: 'runs',
    headerName: 'Last 10',
    width: 160,
    sortable: false,
    renderCell: params => <RunStrip runs={params.row.runs} />,
  },
  {
    field: 'consoleUrl',
    headerName: 'Console',
    width: 130,
    sortable: false,
    renderCell: params => (
      <Link
        href={params.row.consoleUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={event => event.stopPropagation()}
      >
        AWS Lambda
      </Link>
    ),
  },
];

const runColumns: GridColDef<LambdaJobRunRes>[] = [
  {
    field: 'time',
    headerName: 'Time',
    width: 190,
    valueFormatter: (value: string) => format(new Date(value), 'MMM d, h:mm:ss a'),
  },
  {
    field: 'ok',
    headerName: 'Status',
    width: 130,
    renderCell: params => <StatusChip run={params.row} />,
  },
  {
    field: 'durationMs',
    headerName: 'Duration',
    width: 110,
    valueFormatter: (value: number) => formatDuration(value),
  },
  {
    field: 'errorMessage',
    headerName: 'Error',
    flex: 1,
    minWidth: 240,
    sortable: false,
  },
];

export default function JobsPage() {
  const [{ data, loading, error }] = useAxios<LambdaJobsRes>('/lambda_jobs');
  const [selectedName, setSelectedName] = useState<string | null>(null);

  if (loading) {
    return <WorkspaceSpinner />;
  }
  if (error || data === undefined) {
    return (
      <WorkspacePage>
        <Typography variant="body2" sx={{ p: 1 }}>
          Could not load jobs.
        </Typography>
      </WorkspacePage>
    );
  }

  const rows: JobRow[] = data.map(job => ({ ...job, id: job.name }));
  const selected = rows.find(job => job.name === selectedName) ?? null;
  const runRows = selected?.runs ?? [];

  return (
    <WorkspacePage>
      <Box
        sx={{
          flexShrink: 0,
          mb: selected === null ? 0 : 1,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          '& .MuiDataGrid-root': { border: 0 },
        }}
      >
        <SectionTitle title="Jobs" />
        <DataGrid
          autoHeight
          rows={rows}
          columns={jobColumns}
          hideFooter
          disableColumnMenu
          rowSelectionModel={selected === null ? [] : [selected.id]}
          onRowClick={params => setSelectedName(
            selectedName === params.row.name ? null : params.row.name,
          )}
        />
      </Box>
      {selected !== null && (
        <WorkspaceSection title={`${selected.label} runs`}>
          <DataGrid
            rows={runRows}
            columns={runColumns}
            hideFooter
            disableColumnMenu
            disableRowSelectionOnClick
          />
        </WorkspaceSection>
      )}
    </WorkspacePage>
  );
}

function SectionTitle(props: { title: string }) {
  return (
    <Typography
      variant="subtitle2"
      sx={{
        px: 1,
        py: 0.75,
        bgcolor: theme => (theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200'),
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      {props.title}
    </Typography>
  );
}

function StatusChip(props: { run: LambdaJobRunRes | undefined }) {
  if (props.run === undefined) {
    return <Chip size="small" label="No runs" />;
  }
  return (
    <Chip
      size="small"
      label={props.run.ok ? 'Succeeded' : 'Failed'}
      color={props.run.ok ? 'success' : 'error'}
    />
  );
}

function RunStrip(props: { runs: LambdaJobRunRes[] }) {
  const oldestFirst = props.runs.slice().reverse();
  return (
    <Box sx={{ display: 'flex', gap: '2px', alignItems: 'center', height: '100%' }}>
      {oldestFirst.map(run => (
        <Tooltip key={run.id} title={runTitle(run)}>
          <Box
            sx={{
              width: 8,
              height: 16,
              borderRadius: 0.25,
              bgcolor: run.ok ? 'success.main' : 'error.main',
            }}
          />
        </Tooltip>
      ))}
    </Box>
  );
}

function runTitle(run: LambdaJobRunRes): string {
  const when = format(new Date(run.time), 'MMM d, h:mm a');
  return run.ok ? `${when}: succeeded` : `${when}: failed`;
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }
  return `${(durationMs / 1000).toFixed(1)} s`;
}
