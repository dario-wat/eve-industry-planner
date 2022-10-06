import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
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

// TODO delete a scribble
export default function DashboardScribblesCard() {
  const [{ data, loading }] = useAxios<ScribblesRes>('/scribbles');
  const [scribbles, setScribbles] = useState<ScribblesRes>([]);
  const setScribblesFull = (newText: string, index: number) =>
    setScribbles(scribbles.map((s, i) => ({
      name: s.name,
      text: i === index ? newText : s.text,
    })));
  useEffect(
    () => setScribbles(data ?? []),
    [data],
  );

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
  console.log(scribbles);

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
            text={scribbles[selectedTab].text}
            onChange={(text) => setScribblesFull(text, selectedTab)}
            onSave={() => onSaveButtonClick(selectedTab)}
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
  text: string,
  onChange: (text: string) => void,
  onSave: () => void,
}) {
  const [isSaving, setIsSaving] = useState(false);
  const onSaveClick = () => {
    setIsSaving(true);
    props.onSave();
    setIsSaving(false);
  };
  return (
    <>
      <TextField
        fullWidth
        multiline
        rows={15}
        placeholder="Scribble something"
        value={props.text}
        onChange={e => props.onChange(e.target.value)}
      />
      <LoadingButton
        loading={isSaving}
        variant="contained"
        onClick={onSaveClick}
      >
        Save
      </LoadingButton>
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