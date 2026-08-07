// src/pages/Login.jsx
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

// The confirm-sign-up ("enter the code we emailed you") step has no way
// back by default — the Authenticator's state machine lives in
// Authenticator.Provider at the app root (App.jsx), not in this page, so
// navigating away and back via the header just re-renders the same stuck
// step instead of resetting it. toSignIn() is Amplify's own escape hatch
// for exactly this: it resets the machine to the sign-in step.
function ConfirmSignUpFooter() {
  const { toSignIn } = useAuthenticator();
  return (
    <div style={{ textAlign: 'center', marginTop: '15px' }}>
      <button
        type="button"
        className="amplify-button amplify-field-group__control"
        onClick={toSignIn}
        style={{ background: 'none', border: 'none', color: 'var(--amplify-colors-font-interactive)', cursor: 'pointer', textDecoration: 'underline' }}
      >
        Cancel
      </button>
    </div>
  );
}

// Sends the shopper back to whatever page they clicked "Sign in" from
// (App.jsx's setPage stashes it as router state) rather than always
// landing on a fixed page. Extracted into its own component since it's
// only reached once <Authenticator> has actually authenticated someone,
// and hooks need a real component to live in — not the inline render-prop
// function below.
function AuthenticatedRedirect({ to }) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to, { replace: true });
  }, [to, navigate]);

  return null;
}

export default function Login() {
  const location = useLocation();
  const from = location.state?.from || '/';

  return (
    <div className="login-page" style={{ padding: '80px 20px', display: 'flex', justifyContent: 'center' }}>
      <Authenticator components={{ ConfirmSignUp: { Footer: ConfirmSignUpFooter } }}>
        {() => <AuthenticatedRedirect to={from} />}
      </Authenticator>
    </div>
  );
}
