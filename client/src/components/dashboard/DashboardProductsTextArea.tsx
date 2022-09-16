import { Box, Grid, TextField } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import axios from 'axios';
import { useEffect, useState } from 'react';
import {
  filterNullOrUndef,
  PlannedProductsRes,
  PlannedProductsWithErrorRes,
} from '@internal/shared';

export default function DashboardProductsTextArea(
  props: {
    plannedProducts: PlannedProductsRes,
    onUpdate: (plannedProducts: PlannedProductsRes) => void,
  }
) {
  const [text, setText] = useState('');
  const [errors, setErrors] = useState([]);
  useEffect(
    () => setText(
      props.plannedProducts.map(pp => pp.name + ' ' + pp.quantity).join('\n'),
    ),
    [props.plannedProducts],
  );



  const [isSubmitting, setIsSubmitting] = useState(false);
  const onButtonClick = async () => {
    setIsSubmitting(true);
    const { data } = await axios.post<PlannedProductsWithErrorRes>(
      '/planned_products_recreate',
      { text },
    );

    const errors = filterNullOrUndef(data.map(pp => pp.error));
    if (!data.some(e => e.error === null)) {
      // Update only when no errors
      props.onUpdate(data.map(pp => ({
        name: pp.name,
        quantity: pp.quantity!,
      })));
    }
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
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <LoadingButton
            loading={isSubmitting}
            variant="contained"
            onClick={onButtonClick}
          >
            Submit
          </LoadingButton>
        </Grid>
        <Grid item xs={8}>
          Bullshit
        </Grid>
      </Grid>
    </Box>
  );
}