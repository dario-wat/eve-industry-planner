import { CLIENT_ID, SECRET, CALLBACK_URI, SSO_STATE } from 'lib/eve_sso/EveSsoConfig';
import eveScopes from 'lib/eve_sso/eveScopes';
import EveSso from 'lib/eve_sso/evesso';
import eveLoginImage from 'assets/eve-sso-login-white-small.png';

export default function EveLoginButton() {
  const sso = new EveSso(
    CLIENT_ID,
    SECRET,
    CALLBACK_URI,
    {
      // TODO remove these optional arguments
      endpoint: 'https://login.eveonline.com', // optional, defaults to this
      userAgent: 'my-user-agent' // optional
    }
  );

  // TODO SSO_STATE should be generated
  return (
    <a href={sso.getRedirectUrl(SSO_STATE, eveScopes)}>
      <img src={eveLoginImage} alt="Eve login" />
    </a>
  );
}