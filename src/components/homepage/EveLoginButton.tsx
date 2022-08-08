import useAxios from 'axios-hooks';
import eveLoginImage from 'assets/eve-sso-login-white-small.png';

export default function EveLoginButton() {
  const [{ data }] = useAxios(
    'http://localhost:8080/login_url',
  );

  return (
    <a href={data}>
      <img src={eveLoginImage} alt="Eve login" />
    </a>
  );
}