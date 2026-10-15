'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ArrowRight } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

export default function AuthPage() {
  const router = useRouter();
  const { signIn, signUp, supabaseReady, cloudStatus, notify } = useWorkspace();
  const [mode, setMode] = useState('signin'); // signin | signup
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already connected, redirect to dashboard
  if (cloudStatus === 'connected') {
    router.push('/');
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');

    if (!email || !password) {
      setError('Email and password are required.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (mode === 'signin') {
      router.push('/');
    }
  }

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="brand-mark" style={{
            width: 56, height: 56, borderRadius: 18,
            margin: '0 auto 16px', fontSize: 24
          }}>
            <Heart size={28} fill="currentColor" />
          </div>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p style={{ color: '#8a9b97', fontSize: 13 }}>
            {mode === 'signin'
              ? 'Sign in to access your wedding workspace'
              : 'Start planning your wedding budget together'}
          </p>
        </div>

        {!supabaseReady && (
          <div className="tip-box" style={{ marginBottom: 20 }}>
            <span>
              Supabase is not configured. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your <code>.env.local</code> file,
              then restart the dev server.
            </span>
          </div>
        )}

        <div className="panel" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: 16 }}>
              <label className="settings-panel" style={{ margin: 0, padding: 0, border: 0, boxShadow: 'none', background: 'transparent' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#59736c', marginBottom: 7, display: 'block' }}>
                  Email address
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  autoFocus
                  disabled={!supabaseReady}
                  style={{
                    width: '100%', padding: '12px 14px', border: '1px solid #dfe9e4',
                    borderRadius: 9, fontSize: 13, outline: 'none',
                  }}
                />
              </label>

              <label>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#59736c', marginBottom: 7, display: 'block' }}>
                  Password
                </span>
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  minLength={6}
                  placeholder="At least 6 characters"
                  disabled={!supabaseReady}
                  style={{
                    width: '100%', padding: '12px 14px', border: '1px solid #dfe9e4',
                    borderRadius: 9, fontSize: 13, outline: 'none',
                  }}
                />
              </label>

              {error && (
                <p style={{ color: '#b45309', fontSize: 12, margin: 0, padding: '8px 12px', background: '#fef3e2', borderRadius: 8 }}>
                  {error}
                </p>
              )}

              <button
                className="primary-button"
                type="submit"
                disabled={loading || !supabaseReady}
                style={{ width: '100%', padding: '13px 16px', fontSize: 13, marginTop: 4 }}
              >
                {loading
                  ? 'Please wait…'
                  : mode === 'signin'
                    ? 'Sign in'
                    : 'Create account'
                }
                {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            {mode === 'signin' ? (
              <p style={{ fontSize: 12, color: '#8a9b97' }}>
                Don&apos;t have an account?{' '}
                <button
                  className="inline-link"
                  onClick={() => { setMode('signup'); setError(''); }}
                  style={{ fontWeight: 700 }}
                >
                  Create one
                </button>
              </p>
            ) : (
              <p style={{ fontSize: 12, color: '#8a9b97' }}>
                Already have an account?{' '}
                <button
                  className="inline-link"
                  onClick={() => { setMode('signin'); setError(''); }}
                  style={{ fontWeight: 700 }}
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#a0ada8', marginTop: 16 }}>
          You can also use WedPlan in demo mode without signing in.{' '}
          <button className="inline-link" onClick={() => router.push('/')} style={{ fontSize: 11 }}>
            Continue as guest
          </button>
        </p>
      </div>
    </div>
  );
}
