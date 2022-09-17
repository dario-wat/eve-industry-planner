import { Grid } from '@material-ui/core';
import EveIcon from 'components/util/EveIcon';

export default function EveIconAndName(props: {
  typeId: number,
  categoryId: number,
  name: string,
}) {
  return (
    <Grid container alignItems="center">
      <Grid item xs={2}>
        <EveIcon
          typeId={props.typeId}
          categoryId={props.categoryId}
          size={24} />
      </Grid>
      <Grid item xs={10}>
        {props.name}
      </Grid>
    </Grid>
  );
}