import eveLoginImage from 'assets/eve-sso-login-white-small.png';

// TODO add login URL
export default function EveLoginButton() {
  return (
    <a href={'/insert_link_to_eve_login'}>
      <img src={eveLoginImage} alt="Eve login" />
    </a>
  );
}