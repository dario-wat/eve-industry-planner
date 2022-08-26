import { Box, Button, TextField } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { PlannedProductsResponse } from 'types/types';

export default function DashboardProductsTextArea(
  props: {
    plannedProducts: PlannedProductsResponse,
    onUpdate: (plannedProducts: PlannedProductsResponse) => void,
  }
) {
  const [text, setText] = useState('');
  useEffect(
    () => setText(
      props.plannedProducts.map(pp => pp.name + ' ' + pp.quantity).join('\n')
    ),
    [props],
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const onButtonClick = async () => {

    const { data } = await axios.post('/planned_products_recreate', { text });
    props.onUpdate(data);
    console.log(data);
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
      {isSubmitting ?
        <LoadingButton loading variant="contained">
          Submit
        </LoadingButton>
        :
        <Button variant="contained" onClick={onButtonClick}>Submit</Button>
    </Box>
  );
}