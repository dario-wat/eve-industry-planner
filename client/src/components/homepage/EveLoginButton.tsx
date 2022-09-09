import eveLoginImageWhiteSmall from 'assets/eve-sso-login-white-small.png';
import eveLoginImageBlackLarge from 'assets/eve-sso-login-black-large.png';
import useAxios from 'axios-hooks';

type Props = {
  useBlack?: boolean,
};

export default function EveLoginButton(
  { useBlack = false }: Props,
) {
  const [{ data }] = useAxios('/login_url');

  const eveLoginImage = useBlack
    ? eveLoginImageBlackLarge
    : eveLoginImageWhiteSmall;
  return (
    <a href={data}>
      <img src={eveLoginImage} alt="Eve login" />
    </a>
  );
}