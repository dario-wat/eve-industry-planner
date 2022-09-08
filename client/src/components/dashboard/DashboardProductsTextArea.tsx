import { Box, TextField } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { PlannedProductsRes } from '@internal/shared';

export default function DashboardProductsTextArea(
  props: {
    plannedProducts: PlannedProductsRes,
    onUpdate: (plannedProducts: PlannedProductsRes) => void,
  }
) {
  const [text, setText] = useState('');
  useEffect(
    () => setText(
      props.plannedProducts.map(pp => pp.name + ' ' + pp.quantity).join('\n')
    ),
    [props.plannedProducts],
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const onButtonClick = async () => {
    setIsSubmitting(true);
    const { data } = await axios.post('/planned_products_recreate', { text });
    props.onUpdate(data);
    setIsSubmitting(false);
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
      <LoadingButton
        loading={isSubmitting}
        variant="contained"
        onClick={onButtonClick}
      >
        Submit
      </LoadingButton>
    </Box>
  );
}