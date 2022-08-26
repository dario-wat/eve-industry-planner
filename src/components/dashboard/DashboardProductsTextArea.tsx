import { Box, Button, TextField } from '@mui/material';
import axios from 'axios';
import { useState } from 'react';
import { useAppSelector } from 'redux/hooks';
import { selectPlannedProducts } from 'redux/slices/plannedProductsSlice';

export default function DashboardProductsTextArea() {
  const plannedProducts = useAppSelector(selectPlannedProducts);
  const [text, setText] = useState(
    plannedProducts.map(pp => pp.name + ' ' + pp.quantity).join('\n'),
  );

  const onButtonClick = async () => {
    // TODO wait for returned results
    // TODO use state to show loading
    const response = await axios.post('/planned_products_recreate', { text });
    console.log(response);
  };

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