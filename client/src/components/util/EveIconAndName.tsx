import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import { Link as RouterLink } from 'react-router-dom';
import EveIcon from 'components/util/EveIcon';

export default function EveIconAndName(props: {
  typeId: number,
  categoryId?: number,
  name: string,
  /** Links the name to the Item page. */
  linkToItem?: boolean,
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
        {props.linkToItem
          ? (
            <Link
              component={RouterLink}
              to={`/market_history?typeId=${props.typeId}`}
              color="inherit"
              underline="hover"
            >
              {props.name}
            </Link>
          )
          : props.name}
      </Grid>
    </Grid>
  );
}
