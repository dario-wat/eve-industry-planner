import { Box, Button, TextField } from '@mui/material';
import axios from 'axios';
import { useState } from 'react';

export default function DashboardProductsTextArea() {
  const [text, setText] = useState('');

  const onButtonClick = () =>
    // TODO wait for returned results
    axios.post('/planned_products_recreate', { text });

  return (
    <Box>
      <TextField
        sx={{ pb: 2 }}
        fullWidth
        multiline
        placeholder={
          'Each line is a separate product.\n'
          + 'Format: "product_name quantity" without quotes\n'
          + 'E.g.\n'
          + 'Nanofiber Internal Structure II 10\n'
          + '1MN Afterburner II 5\n'
          + 'Kikimora 1'
        }
        rows={15}
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <Button variant="contained" onClick={onButtonClick}>Submit</Button>
    </Box>
  );
}