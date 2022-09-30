import Grid from '@mui/material/Grid';
import EveIcon from 'components/util/EveIcon';

export default function EveIconAndName(props: {
  typeId: number,
  categoryId: number,
  name: string,
}) {
  return (
    <Grid container alignItems="center" columnSpacing={1}>
      <Grid item xs={1}>
        <EveIcon
          typeId={props.typeId}
          categoryId={props.categoryId}
          size={24} />
      </Grid>
      <Grid item xs={11}>
        {props.name}
      </Grid>
    </Grid>
  );
}