import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [oauthProvider, setOauthProvider] = useState(null);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(email, password);
    } catch (err) {
      console.error('[login-error]', err);
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  const handleSkipOAuth = (role) => {
    if (loading || oauthProvider) return;
    setError('');
    if (role === 'admin') {
      setEmail('admin@nhai.gov.in');
      setPassword('admin123');
    } else if (role === 'engineer') {
      setEmail('engineer@nhai.gov.in');
      setPassword('eng123');
    } else if (role === 'viewer') {
      setEmail('viewer@pwdassam.gov.in');
      setPassword('view123');
    }
  };

  const handleOauthLogin = (provider, demoEmail, demoPassword, toastMsg) => {
    if (loading || oauthProvider) return;
    setOauthProvider(provider);
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');

    setTimeout(async () => {
      try {
        await login(demoEmail, demoPassword);
        sessionStorage.setItem('oauth_toast', toastMsg);
      } catch (err) {
        console.error('[oauth-login-error]', err);
        setError(err.message || `Failed to sign in with ${provider}.`);
        setOauthProvider(null);
      }
    }, 1500);
  };

  return (
    <div 
      className="min-h-screen flex flex-col justify-between items-center px-4 py-8 animate-fade-in-up login-background"
      style={{ color: 'var(--text-primary)' }}
    >
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .login-background {
          background: linear-gradient(
            -45deg, 
            #e0e7ff,
            #bfdbfe, 
            #a5f3fc,
            #bbf7d0,
            #fde68a,
            #fecdd3,
            #e9d5ff
          );
          background-size: 400% 400%;
          animation: gradientShift 10s ease infinite;
          min-height: 100vh;
        }
      `}</style>
      {/* Top spacing */}
      <div className="hidden sm:block" />

      {/* Main Login Card */}
      <div className="w-full max-w-md space-y-8 my-auto">
        <div className="text-center space-y-4">
          {/* Centered Bridge Health Monitor Logo */}
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl animate-pulse-live" style={{ background: 'var(--accent-blue-light)' }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M4 28 L4 20 L12 14 L20 10 L28 14 L36 20 L36 28" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              <path d="M4 28 L36 28" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M12 28 L12 14" stroke="white" strokeWidth="1.5" strokeDasharray="2 2"/>
              <path d="M20 28 L20 10" stroke="white" strokeWidth="1.5" strokeDasharray="2 2"/>
              <path d="M28 28 L28 14" stroke="white" strokeWidth="1.5" strokeDasharray="2 2"/>
            </svg>
          </div>
          
          <div className="space-y-1.5">
            <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Bridge Health Monitor</h1>
            <p className="text-xs uppercase tracking-widest font-extrabold text-[var(--text-secondary)]" style={{ color: 'var(--text-secondary)' }}>
              Structural Health Monitoring Platform — NHAI
            </p>
            <p style={{
              fontSize: '13px',
              color: '#6b7280',
              textAlign: 'center',
              marginTop: '4px',
              marginBottom: '24px'
            }}>
              Monitoring 58 bridges across India in real-time
            </p>
          </div>
        </div>

        <div className="login-card space-y-6 mx-auto">
          {error && (
            <div 
              className="px-4 py-3 rounded-xl text-xs font-semibold leading-relaxed animate-fade-in-up flex items-center gap-2"
              style={{ background: 'rgba(255, 123, 114, 0.08)', border: '1px solid rgba(255, 123, 114, 0.2)', color: 'var(--accent-red-light)' }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@nhai.gov.in"
                className="w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-[#58a6ff]"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-[#58a6ff]"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full font-bold uppercase py-3 rounded-xl transition hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              style={{ background: 'var(--nav-bg)', color: '#ffffff' }}
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-1">⟳</span>
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p style={{
            fontSize: '11px',
            color: '#9ca3af',
            textAlign: 'center',
            marginTop: '8px'
          }}>
            Demo: admin@nhai.gov.in / admin123
          </p>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
            <hr style={{ flex: 1, borderColor: 'var(--border-subtle)' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>OR CONTINUE WITH</span>
            <hr style={{ flex: 1, borderColor: 'var(--border-subtle)' }} />
          </div>

          {/* OAuth Buttons Row */}
          <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'flex-start' }}>
            {/* Google */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <button
                type="button"
                disabled={loading || !!oauthProvider}
                onClick={() => handleOauthLogin('google', 'admin@nhai.gov.in', 'demo123', '✓ Signed in with Google as Admin')}
                style={{
                  height: '44px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: (loading || oauthProvider) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  background: 'var(--bg-card)', color: 'var(--text-primary)',
                  width: '100%',
                  opacity: oauthProvider ? (oauthProvider === 'google' ? 1 : 0.4) : 1,
                }}
                onMouseEnter={(e) => { if (!loading && !oauthProvider) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
              >
                {oauthProvider === 'google' ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span style={{ fontSize: '12px' }}>Signing in...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    <span>Google</span>
                  </>
                )}
              </button>
            </div>

            {/* GitHub */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <button
                type="button"
                disabled={loading || !!oauthProvider}
                onClick={() => handleOauthLogin('github', 'engineer@bridgeiq.in', 'demo123', '✓ Signed in with GitHub as Engineer')}
                style={{
                  height: '44px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: (loading || oauthProvider) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  background: 'var(--bg-card)', color: 'var(--text-primary)',
                  width: '100%',
                  opacity: oauthProvider ? (oauthProvider === 'github' ? 1 : 0.4) : 1,
                }}
                onMouseEnter={(e) => { if (!loading && !oauthProvider) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
              >
                {oauthProvider === 'github' ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span style={{ fontSize: '12px' }}>Signing in...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    <span>GitHub</span>
                  </>
                )}
              </button>
            </div>

            {/* NHAI SSO */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center' }}>
              <button
                type="button"
                disabled={loading || !!oauthProvider}
                onClick={() => handleOauthLogin('nhai', 'viewer@nhai.gov.in', 'demo123', '✓ Signed in with NHAI SSO as Viewer')}
                style={{
                  height: '44px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: (loading || oauthProvider) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  background: '#FF6B00',
                  color: '#ffffff',
                  width: '100%',
                  opacity: oauthProvider ? (oauthProvider === 'nhai' ? 1 : 0.4) : 1,
                }}
                onMouseEnter={(e) => { if (!loading && !oauthProvider) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
              >
                {oauthProvider === 'nhai' ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span style={{ fontSize: '12px' }}>Signing in...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="9" />
                      <circle cx="12" cy="12" r="2" fill="currentColor" />
                      <line x1="12" y1="3" x2="12" y2="21" />
                      <line x1="3" y1="12" x2="21" y2="12" />
                      <line x1="5.64" y1="5.64" x2="18.36" y2="18.36" />
                      <line x1="5.64" y1="18.36" x2="18.36" y2="5.64" />
                    </svg>
                    <span>NHAI SSO</span>
                  </>
                )}
              </button>
              <span style={{ color: 'var(--text-secondary)', fontSize: '9px', fontWeight: '600', marginTop: '6px', letterSpacing: '0.3px', textTransform: 'uppercase', opacity: 0.8 }}>
                Gov. India Portal
              </span>
            </div>
          </div>

          {/* Quick Demo Access Buttons */}
          <div style={{ marginTop: '16px' }}>
            <p style={{ 
              fontSize: '11px', 
              color: '#9ca3af', 
              textAlign: 'center',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Quick Demo Access
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {['Admin', 'Engineer', 'Viewer'].map(role => (
                <button
                  key={role}
                  type="button"
                  disabled={loading || !!oauthProvider}
                  onClick={() => handleSkipOAuth(role.toLowerCase())}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    background: 'white',
                    color: '#374151',
                    cursor: (loading || oauthProvider) ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    opacity: (loading || oauthProvider) ? 0.5 : 1
                  }}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Security Notice */}
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', textAlign: 'center', marginTop: '16px' }}>
            🔒 Demo OAuth — No real credentials stored. 
            Production version uses verified Google OAuth 2.0
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 w-full space-y-1 mt-8" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>
          Ministry of Road Transport & Highways · NHAI
        </p>
        <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
          Government of India • Bridge Health Monitor Secure Access Portal • Powered by AI — IRC:6-2017 Compliant
        </p>
      </footer>
    </div>
  );
}
