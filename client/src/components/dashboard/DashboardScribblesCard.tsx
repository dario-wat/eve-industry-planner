import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import LoadingButton from '@mui/lab/LoadingButton';
import useAxios from 'axios-hooks';
import { useState } from 'react';
import axios from 'axios';

export default function DashboardScribblesCard() {
  const [{ data }] = useAxios('/scribbles');
  console.log(data);

  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const onSaveButtonClick = async () => {
    setIsSaving(true);
    const { data } = await axios.post(
      '/create_scribble',
      { name: 'test', text },
    );
    // setText(data);
    console.log(data);
    setIsSaving(false);
  };
  return (
    <Card>
      <CardContent>
        <TextField
          fullWidth
          multiline
          rows={15}
          placeholder="Scribble something"
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <LoadingButton
          loading={isSaving}
          variant="contained"
          onClick={onSaveButtonClick}
        >
          Save
        </LoadingButton>
      </CardContent>
    </Card>
  );
}