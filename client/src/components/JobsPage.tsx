import useAxios from 'axios-hooks';
import { useState } from 'react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { JobRunRes, JobRunStatusRes, JobsRes } from '@internal/shared';
import { formatNumber } from 'common/format';
import WorkspacePage, { WorkspaceSection, WorkspaceSpinner } from 'components/util/WorkspacePage';

type JobRes = JobsRes[number];

const RUN_SLOTS = 10;

const STATUS_COLOR: Record<JobRunStatusRes, string> = {
  success: 'success.main',
  failure: 'error.main',
  running: 'info.main',
};

export default function JobsPage() {
  const [{ data }] = useAxios<JobsRes>('/jobs');
  const [selectedJobName, setSelectedJobName] = useState<string | null>(null);
  const [openRun, setOpenRun] = useState<JobRunRes | null>(null);

  if (data === undefined) {
    return (
      <WorkspacePage>
        <WorkspaceSpinner />
      </WorkspacePage>
    );
  }

  const selectedJob = data.find(job => job.jobName === selectedJobName) ?? null;

  const jobColumns: GridColDef<JobRes>[] = [
    { field: 'jobName', headerName: 'Name', width: 240 },
    {
      field: 'schedule',
      headerName: 'Schedule',
      width: 260,
      valueFormatter: (value: string | null) => value ?? 'Manual',
    },
    {
      field: 'runs',
      headerName: `Last ${RUN_SLOTS} runs`,
      width: 220,
      sortable: false,
      renderCell: params => <RunSquares runs={params.row.runs} />,
    },
    {
      field: 'lastRun',
      headerName: 'Last run',
      width: 160,
      sortable: false,
      valueGetter: (_value, row) => row.runs.length > 0
        ? formatDistanceToNowStrict(new Date(row.runs[0].startedAt), { addSuffix: true })
        : 'never',
    },
  ];

  const runColumns: GridColDef<JobRunRes>[] = [
    {
      field: 'startedAt',
      headerName: 'Started',
      width: 170,
      valueFormatter: (value: string) => format(new Date(value), 'yyyy-MM-dd HH:mm:ss'),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: params => (
        <Box sx={{ color: STATUS_COLOR[params.row.status], fontWeight: 'bold' }}>
          {params.row.status}
        </Box>
      ),
    },
    {
      field: 'elapsedMs',
      headerName: 'Duration',
      width: 100,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value: number | null) => value === null ? '—' : formatDuration(value),
    },
    {
      field: 'peakRssMb',
      headerName: 'Peak memory',
      width: 110,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value: number | null) => value === null ? '—' : `${formatNumber(value)} MB`,
    },
    {
      field: 'error',
      headerName: 'Error',
      width: 300,
      sortable: false,
      valueFormatter: (value: string | null) => value?.split('\n')[0] ?? '',
    },
    {
      field: 'summary',
      headerName: 'Result',
      flex: 1,
      minWidth: 300,
      sortable: false,
      valueFormatter: (value: Record<string, unknown> | null) => formatSummaryInline(value),
    },
  ];

  return (
    <WorkspacePage>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ flexShrink: 0, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <DataGrid
            autoHeight
            density="compact"
            rows={data}
            columns={jobColumns}
            getRowId={row => row.jobName}
            rowSelectionModel={selectedJobName === null ? [] : [selectedJobName]}
            onRowClick={params => setSelectedJobName(params.row.jobName)}
            hideFooter
            disableColumnMenu
            sx={{ border: 0, '& .MuiDataGrid-row': { cursor: 'pointer' } }}
          />
        </Box>
        {selectedJob !== null &&
          <WorkspaceSection title={`${selectedJob.jobName}: last ${RUN_SLOTS} runs`}>
            <DataGrid
              autoHeight={false}
              density="compact"
              rows={selectedJob.runs}
              columns={runColumns}
              onRowClick={params => setOpenRun(params.row)}
              hideFooter
              disableColumnMenu
              disableRowSelectionOnClick
              sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
            />
          </WorkspaceSection>
        }
      </Box>
      <RunDialog run={openRun} onClose={() => setOpenRun(null)} />
    </WorkspacePage>
  );
}

/** Oldest on the left, so the newest run is always the rightmost square. */
function RunSquares({ runs }: { runs: JobRunRes[] }) {
  const ordered = [...runs].reverse();
  const emptySlots = Math.max(0, RUN_SLOTS - ordered.length);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, height: '100%' }}>
      {Array.from({ length: emptySlots }, (_, i) => (
        <Box key={`empty-${i}`} sx={{ ...squareSx, border: 1, borderColor: 'divider' }} />
      ))}
      {ordered.map(run => (
        <Tooltip
          key={run.id}
          title={`${run.status} · ${format(new Date(run.startedAt), 'yyyy-MM-dd HH:mm')}`
            + (run.elapsedMs === null ? '' : ` · ${formatDuration(run.elapsedMs)}`)}
        >
          <Box sx={{ ...squareSx, bgcolor: STATUS_COLOR[run.status] }} />
        </Tooltip>
      ))}
    </Box>
  );
}

const squareSx = { width: 14, height: 14, borderRadius: 0.5, flexShrink: 0 };

function RunDialog({ run, onClose }: { run: JobRunRes | null, onClose: () => void }) {
  return (
    <Dialog open={run !== null} onClose={onClose} maxWidth="md" fullWidth>
      {run !== null &&
        <>
          <DialogTitle sx={{ pr: 6 }}>
            Run {run.id} · {run.status} · {format(new Date(run.startedAt), 'yyyy-MM-dd HH:mm:ss')}
          </DialogTitle>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
          <DialogContent dividers>
            {run.error !== null &&
              <>
                <Typography variant="subtitle2" color="error">Error</Typography>
                <Box component="pre" sx={preSx}>{run.error}</Box>
              </>
            }
            <Typography variant="subtitle2">Result</Typography>
            <Box component="pre" sx={preSx}>
              {run.summary === null ? '—' : JSON.stringify(run.summary, null, 2)}
            </Box>
          </DialogContent>
        </>
      }
    </Dialog>
  );
}

const preSx = {
  fontSize: 12,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  mt: 0.5,
  mb: 2,
};

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms} ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)} s`;
  }
  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return hours > 0 ? `${hours} h ${minutes} m` : `${minutes} m ${secs} s`;
}

/** Scalars as values, arrays and objects as their size; the dialog shows the full JSON. */
function formatSummaryInline(summary: Record<string, unknown> | null): string {
  if (summary === null) {
    return '';
  }
  return Object.entries(summary)
    .map(([key, value]) => {
      if (typeof value === 'number') {
        return `${key}: ${formatNumber(value, Number.isInteger(value) ? 0 : 1)}`;
      }
      if (Array.isArray(value)) {
        return `${key}: [${value.length}]`;
      }
      if (value !== null && typeof value === 'object') {
        return `${key}: {${Object.keys(value).length}}`;
      }
      return `${key}: ${String(value)}`;
    })
    .join(' · ');
}
