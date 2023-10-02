import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { withStyles } from '@material-ui/styles';
import LoadingButton from '@mui/lab/LoadingButton';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { first } from 'underscore';
import { useAppDispatch } from 'redux/hooks';
import { fetchProductionPlan } from 'redux/slices/productionPlanSlice';
import {
  filterNullOrUndef,
  PlannedProductsRes,
  PlannedProductsWithErrorRes,
} from '@internal/shared';

export default function DashboardProductsTextArea(props: {
  group: string,
  plannedProducts: PlannedProductsRes,
  onUpdate: () => void,
}) {
  const [text, setText] = useState('');
  useEffect(
    () => setText(
      props.plannedProducts.map(pp => pp.name + ' ' + pp.quantity).join('\n'),
    ),
    [props.plannedProducts],
  );

  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const onButtonClick = async () => {
    if (props.group === '') {
      console.log('boefre');
      toast.error('Group name cannot be empty!', {
        position: 'bottom-center',
        autoClose: 3000,
      });
      console.log('bafter');
      return;
    }
    setIsSubmitting(true);
    const { data } = await axios.post<PlannedProductsWithErrorRes>(
      '/planned_products_recreate',
      { text, group: props.group },
    );

    const errors = filterNullOrUndef(data.map(pp => pp.error));
    if (errors.length === 0) {
      // Update only when no errors
      props.onUpdate();

      // Trigger new production plan
      dispatch(fetchProductionPlan());
    }
    setErrors(errors);
    setIsSubmitting(false);
  };

  const RedTextTypography = withStyles({
    root: {
      color: 'red',
    },
  })(Typography);

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
        <Grid item xs={3}>
          <LoadingButton
            loading={isSubmitting}
            variant="contained"
            onClick={onButtonClick}
          >
            Submit
          </LoadingButton>
        </Grid>
        <Grid item xs={9} sx={{ display: 'flex' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <RedTextTypography variant='body2'>
              {first(errors)}
            </RedTextTypography>
          </Box>
        </Grid>
      </Grid>
      <ToastContainer />
    </Box>
  );
}