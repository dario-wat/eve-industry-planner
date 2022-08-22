import eveLoginImage from 'assets/eve-sso-login-white-small.png';
import { useLocalhostAxios } from 'lib/util';

export default function EveLoginButton() {
  const [{ data }] = useLocalhostAxios('/login_url');

  return (
    <a href={data}>
      <img src={eveLoginImage} alt="Eve login" />
    </a>
  );
}