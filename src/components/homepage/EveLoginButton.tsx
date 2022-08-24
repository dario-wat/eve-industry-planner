import eveLoginImage from 'assets/eve-sso-login-white-small.png';
import useAxios from 'axios-hooks';

export default function EveLoginButton() {
  const [{ data }] = useAxios('/login_url');

  return (
    <a href={data}>
      <img src={eveLoginImage} alt="Eve login" />
    </a>
  );
}