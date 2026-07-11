import React, { useState, useEffect } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { userApi } from '../utils/userApi';

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid #332f2b',
  background: '#12100e',
  color: '#e4e4e7',
  fontSize: '0.95rem',
};

const labelStyle = { display: 'block', color: '#a1a1a6', fontSize: '0.85rem', marginBottom: '6px' };

export default function Profile({ setPage }) {
  // Grab the current user details and the global signOut method from Amplify
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const sessionEmail = user?.signInDetails?.loginId || user?.username || 'Chonky Cat Fan';

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState(sessionEmail);
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '' });

  useEffect(() => {
    let cancelled = false;
    userApi.getProfile()
      .then((profile) => {
        if (cancelled) return;
        setForm({
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          phone: profile.phone || '',
        });
        setEmail(profile.email || sessionEmail);
      })
      .catch((err) => {
        if (cancelled) return;
        if (/not found/i.test(err.message)) {
          setNotFound(true);
        } else {
          setLoadError(err.message);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await userApi.updateProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    setPage('home'); // Safely redirect to the storefront after logging out
  };

  return (
    <section className="profile-page container" style={{ padding: '80px 20px', minHeight: '60vh' }}>
      <div className="section-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
        <span className="section-eyebrow">Your Account</span>
        <h2 className="section-title">Chonky <em>Profile</em></h2>
        <div className="section-rule" style={{ margin: '15px auto' }}></div>
      </div>

      <div className="profile-card" style={{
        backgroundColor: '#1c1917',
        border: '1px solid #332f2b',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '500px',
        margin: '0 auto',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        <div className="profile-avatar" style={{
          fontSize: '4rem',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #2e2a24, #12100e)',
          width: '100px',
          height: '100px',
          lineHeight: '100px',
          borderRadius: '50%',
          margin: '0 auto 20px auto',
          border: '2px solid #e0a93c'
        }}>
          😻
        </div>

        <h3 style={{ color: '#FFF', fontSize: '1.5rem', marginBottom: '8px' }}>Welcome Back!</h3>
        <p style={{ color: '#a1a1a6', fontSize: '1rem', marginBottom: '30px', wordBreak: 'break-all' }}>
          {email}
        </p>

        <div className="profile-details" style={{
          textAlign: 'left',
          borderTop: '1px solid #2e2a24',
          borderBottom: '1px solid #2e2a24',
          padding: '20px 0',
          marginBottom: '30px',
          fontSize: '0.95rem',
          color: '#e4e4e7'
        }}>
          <div style={{ display: 'flex', justifyContent: 'between', marginBottom: '10px' }}>
            <span style={{ color: '#a1a1a6' }}>Membership Tier:</span>
            <span style={{ marginLeft: 'auto', color: '#e0a93c', fontWeight: '600' }}>👑 Elite Chonk VIP</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'between' }}>
            <span style={{ color: '#a1a1a6' }}>Account Status:</span>
            <span style={{ marginLeft: 'auto', color: '#4ade80' }}>● Confirmed Live</span>
          </div>
        </div>

        <div style={{ textAlign: 'left', marginBottom: '30px' }}>
          <h4 style={{ color: '#FFF', fontSize: '1.1rem', marginBottom: '15px' }}>Personal Information</h4>

          {loading && <p style={{ color: '#a1a1a6', fontSize: '0.9rem' }}>Loading your details…</p>}

          {notFound && (
            <p style={{ color: '#f8b4b4', fontSize: '0.85rem' }}>
              We couldn't find your profile yet. Try signing out and back in — if that doesn't fix it,
              please contact support.
            </p>
          )}

          {loadError && (
            <p style={{ color: '#f8b4b4', fontSize: '0.85rem' }}>Couldn't load your profile: {loadError}</p>
          )}

          {!loading && !notFound && !loadError && (
            <form onSubmit={handleSave} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={labelStyle} htmlFor="profile-first-name">First name</label>
                <input
                  id="profile-first-name"
                  type="text"
                  value={form.first_name}
                  onChange={updateField('first_name')}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle} htmlFor="profile-last-name">Last name</label>
                <input
                  id="profile-last-name"
                  type="text"
                  value={form.last_name}
                  onChange={updateField('last_name')}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle} htmlFor="profile-phone">Phone</label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={form.phone}
                  onChange={updateField('phone')}
                  style={inputStyle}
                />
              </div>

              {saveError && <p style={{ color: '#f8b4b4', fontSize: '0.85rem', margin: 0 }}>{saveError}</p>}
              {saved && <p style={{ color: '#4ade80', fontSize: '0.85rem', margin: 0 }}>✓ Saved!</p>}

              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
                style={{
                  padding: '10px 20px', fontSize: '0.9rem',
                  backgroundColor: '#e0a93c', color: '#12100e',
                  border: 'none', borderRadius: '4px', fontWeight: '600',
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          )}
        </div>

        <div className="profile-actions" style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button
            className="btn-outline"
            onClick={() => setPage('products')}
            style={{ padding: '10px 20px', fontSize: '0.9rem' }}
          >
            Continue Shopping
          </button>
          <button
            className="btn-primary"
            onClick={handleSignOut}
            style={{
              padding: '10px 20px',
              fontSize: '0.9rem',
              backgroundColor: '#e0a93c',
              color: '#12100e',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </section>
  );
}
