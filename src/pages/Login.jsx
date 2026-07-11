// src/pages/Login.jsx
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

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
      <Authenticator>
        {() => <AuthenticatedRedirect to={from} />}
      </Authenticator>
    </div>
  );
}
