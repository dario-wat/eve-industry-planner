import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import LoadingButton from '@mui/lab/LoadingButton';
import AddIcon from '@mui/icons-material/Add';
import useAxios from 'axios-hooks';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { ScribbleRes, ScribblesRes } from '@internal/shared';
import { CircularProgress } from '@material-ui/core';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

export default function DashboardScribblesCard() {
  const [{ data, loading }, refetch] = useAxios<ScribblesRes>('/scribbles');
  const [scribbles, setScribbles] = useState<ScribblesRes>([]);
  useEffect(
    () => setScribbles(data ?? []),
    [data],
  );

  const setScribblesFull = (newText: string, index: number) =>
    setScribbles(scribbles.map((s, i) => ({
      name: s.name,
      text: i === index ? newText : s.text,
    })));

  const [selectedTab, setSelectedTab] = useState(0);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  const onSaveButtonClick = async (index: number) => {
    const { data } = await axios.post<ScribbleRes>(
      '/create_scribble',
      { name: scribbles[index].name, text: scribbles[index].text },
    );
    setScribblesFull(data.text, index);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 1,
          display: 'flex',
        }}>
          <Tabs
            value={selectedTab}
            onChange={(_, newValue) => setSelectedTab(newValue)}>
            {scribbles.map((s, i) =>
              <Tab label={s.name} value={i} key={i} />
            )}
            <Tab icon={<AddIcon />} value={scribbles.length} />
          </Tabs>
        </Box>
        {selectedTab < scribbles.length &&
          <Scribble
            name={scribbles[selectedTab].name}
            text={scribbles[selectedTab].text}
            onChange={(text) => setScribblesFull(text, selectedTab)}
            onSave={() => onSaveButtonClick(selectedTab)}
            onDelete={() => {
              refetch();
              setSelectedTab(0);
            }}
          />
        }
        {selectedTab === scribbles.length &&
          <AddScribble onAdded={addedScribble =>
            setScribbles([...scribbles, addedScribble])}
          />
        }
      </CardContent>
    </Card>
  );
}

function Scribble(props: {
  name: string,
  text: string,
  onChange: (text: string) => void,
  onSave: () => void,
  onDelete: () => void,
}) {
  const [isEditMode, setIsEditMode] = useState(false);

  const columns: GridColDef[] = [
    {
      field: 'data',
      headerName: 'Data',
      flex: 1,
      sortable: false,
    },
  ];

  const [isSaving, setIsSaving] = useState(false);
  const onSaveClick = () => {
    setIsSaving(true);
    props.onSave();
    setIsEditMode(false);
    setIsSaving(false);
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const onDeleteClick = async () => {
    setIsDeleting(true);
    const { status } = await axios.delete(`/delete_scribble/${props.name}`);
    if (status === 200) {
      props.onDelete();
    }
    setIsDeleting(false);
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={isEditMode}
              onChange={e => setIsEditMode(e.target.checked)}
            />
          }
          label="Edit"
          labelPlacement="start"
        />
        <LoadingButton
          loading={isDeleting}
          variant="contained"
          color="error"
          onClick={onDeleteClick}
        >
          Delete
        </LoadingButton>
      </Box>
      <Box sx={{ pb: 2 }}>
        {isEditMode
          ?
          <TextField
            fullWidth
            multiline
            rows={15}
            placeholder="Scribble something"
            value={props.text}
            onChange={e => props.onChange(e.target.value)}
          />
          :
          <DataGrid
            hideFooter
            rows={props.text.split(/\r?\n/).map(l => ({ data: l }))}
            columns={columns}
            disableSelectionOnClick
            disableColumnMenu
            experimentalFeatures={{ newEditingApi: true }}
          />
        }
      </Box>
      {isEditMode &&
        <Box sx={{ pr: 4 }}>
          <LoadingButton
            loading={isSaving}
            variant="contained"
            onClick={onSaveClick}
          >
            Save
          </LoadingButton>
        </Box>
      }
    </>
  );
}

function AddScribble(props: {
  onAdded: (name: ScribbleRes) => void,
}) {
  const [name, setName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const onAddClick = async () => {
    setIsAdding(true);
    const { data } = await axios.post<ScribbleRes>(
      '/create_scribble',
      { name, text: '' },
    );
    props.onAdded(data)
    setIsAdding(false);
  };

  return (
    <Box>
      <TextField
        sx={{ display: 'block', pb: 2 }}
        label="Scribble Name"
        variant="outlined"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <LoadingButton
        loading={isAdding}
        variant="contained"
        onClick={onAddClick}>
        Add
      </LoadingButton>
    </Box>
  );
}