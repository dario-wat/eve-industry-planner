import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import useAxios from 'axios-hooks';
import { formatDistanceToNowStrict } from 'date-fns';
import { useContext, useState } from 'react';
import { EveContractsRes } from '@internal/shared';
import { UserContext } from 'contexts/UserContext';
import { formatNumberScale } from 'common/format';
import WorkspacePage, { WorkspaceSection, WorkspaceSpinner } from 'components/util/WorkspacePage';

const FINISHED_STATUS = 'finished';

export default function ContractsPage() {
  const [{ data }] = useAxios<EveContractsRes>('/contracts');

  const userContext = useContext(UserContext);

  const [searchText, setSearchText] = useState('');

  const isIncluded = (s: string) =>
    s.toLowerCase().includes(searchText.toLowerCase());
  const filteredData = data && data.filter(d =>
    (d.acceptor && isIncluded(d.acceptor.name))
    || (d.assignee && isIncluded(d.assignee.name))
    || (d.issuer && isIncluded(d.issuer.name))
    || (d.title && isIncluded(d.title))
  );

  const finishedContracts = filteredData &&
    filteredData.filter((c: any) => c.status === FINISHED_STATUS);
  const activeContracts = filteredData &&
    filteredData.filter((c: any) => c.status !== FINISHED_STATUS);

  const emphasizeSelf = (characterId: number | null, text: string) =>
    userContext.is_logged_in
      && characterId
      && userContext.character_ids.includes(characterId)
      ?
      <div style={{ color: 'orange' }}>
        {text}
      </div>
      : text;

  const columns = (dateField: GridColDef): GridColDef[] => ([
    {
      field: 'issuer',
      headerName: 'Issuer',
      width: 150,
      sortable: false,
      valueGetter: (value: any) => value?.name,
      renderCell: params => emphasizeSelf(params.row.issuer?.id, params.value),
    },
    {
      field: 'assignee',
      headerName: 'Assignee',
      width: 150,
      sortable: false,
      valueGetter: (value: any) => value?.name,
      renderCell: params => emphasizeSelf(params.row.assignee?.id, params.value),
    },
    {
      field: 'acceptor',
      headerName: 'Acceptor',
      width: 150,
      sortable: false,
      valueGetter: (value: any) => value?.name,
      renderCell: params => emphasizeSelf(params.row.acceptor?.id, params.value),
    },
    {
      field: 'title',
      headerName: 'Title',
      width: 300,
      sortable: false,
    },
    {
      field: 'price',
      headerName: 'Price',
      width: 100,
      valueFormatter: value => formatNumberScale(value),
    },
    dateField,  // Inject date field here
    {
      field: 'type',
      headerName: 'Type',
      width: 130,
      sortable: false,
    },
  ]);

  const columnsActive = columns(
    {
      field: 'date_expired',
      headerName: 'Expires',
      width: 120,
      sortable: false,
      valueFormatter: value => formatDistanceToNowStrict(
        new Date(value),
        { addSuffix: true },
      ),
    },
  );
  const columnsFinished = columns(
    {
      field: 'date_accepted',
      headerName: 'Accepted',
      width: 120,
      sortable: false,
      valueFormatter: value => formatDistanceToNowStrict(
        new Date(value),
        { addSuffix: true },
      ),
    },
  );

  return (
    <WorkspacePage>
      <Box sx={{ pb: 1, flexShrink: 0 }}>
        <TextField
          label="Search..."
          variant="outlined"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <WorkspaceSection title="Active Contracts">
          {activeContracts ?
            <DataGrid
              autoHeight={false}
              initialState={{
                sorting: {
                  sortModel: [{ field: 'date_expired', sort: 'asc' }],
                },
              }}
              hideFooter={true}
              rows={activeContracts}
              columns={columnsActive}
              disableRowSelectionOnClick
              disableColumnMenu
            />
            : <WorkspaceSpinner />
          }
        </WorkspaceSection>
        <WorkspaceSection title="Finished Contracts">
          {finishedContracts ?
            <DataGrid
              autoHeight={false}
              initialState={{
                sorting: {
                  sortModel: [{ field: 'date_accepted', sort: 'desc' }],
                },
              }}
              rows={finishedContracts}
              columns={columnsFinished}
              disableRowSelectionOnClick
              disableColumnMenu
            />
            : <WorkspaceSpinner />
          }
        </WorkspaceSection>
      </Box>
    </WorkspacePage>
  );
}