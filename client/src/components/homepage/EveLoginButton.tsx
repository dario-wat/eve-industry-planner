import eveLoginImageWhiteSmall from 'assets/eve-sso-login-white-small.png';
import eveLoginImageBlackLarge from 'assets/eve-sso-login-black-large.png';
import useAxios from 'axios-hooks';
import { Box } from '@mui/material';

type Props = {
  useBlack?: boolean,
};

export default function EveLoginButton(
  { useBlack = false }: Props,
) {
  const [{ data }] = useAxios<string>('/login_url');

  const eveLoginImage = useBlack
    ? eveLoginImageBlackLarge
    : eveLoginImageWhiteSmall;
  return (
    <a href={data}>
      <Box display="flex" justifyContent="center">
        <img src={eveLoginImage} alt="Eve login" />
      </Box>
    </a>
  );
}