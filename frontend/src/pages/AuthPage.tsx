import React, { useState } from 'react';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Camera,
  KeyRound,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export type AuthMode = 'login' | 'signup' | 'forgot-password';

interface AuthPageProps {
  initialMode?: AuthMode;
  reason?: 'report' | 'default';
  onSuccess: () => void;
  onCancel: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  reason = 'default',
  onSuccess,
  onCancel,
}) => {
  const { t } = useLanguage();
  const { signup, login, resetPassword, citizen, isLoggedIn, logout } = useAuth();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setError(t('auth.err_name', 'Please enter your full name.'));
      return;
    }
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setError(t('auth.err_email', 'Please enter a valid email address.'));
      return;
    }
    if (!password || password.length < 6) {
      setError(t('auth.err_password_len', 'Password must be at least 6 characters.'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await signup({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (res.success) {
        if (res.needsConfirmation) {
          setSuccessMsg(
            res.message ||
              'Account created successfully. Please verify your email if email confirmation is enabled.'
          );
        } else {
          setSuccessMsg(
            res.message ||
              t('auth.signup_success', 'Account created successfully! Welcome to NagarDrishti AI.')
          );
          setTimeout(() => {
            onSuccess();
          }, 1000);
        }
      } else {
        setError(res.error || 'Failed to create citizen account.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !email.includes('@')) {
      setError(t('auth.err_email', 'Please enter a valid email address.'));
      return;
    }
    if (!password) {
      setError(t('auth.err_password_required', 'Please enter your password.'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await login({
        email: email.trim(),
        password,
      });

      if (res.success) {
        setSuccessMsg(t('auth.login_success', 'Welcome back! Signed in successfully.'));
        setTimeout(() => {
          onSuccess();
        }, 800);
      } else {
        setError(res.error || 'Invalid credentials. Please verify or reset your password.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !email.includes('@')) {
      setError(t('auth.err_email', 'Please enter your registered email address.'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await resetPassword(email.trim());

      if (res.success) {
        setSuccessMsg(
          t(
            'auth.reset_sent',
            'Password reset link sent! Please check your email inbox to update your password.'
          )
        );
      } else {
        setError(res.error || 'Failed to send reset link. Please verify your email.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // If already logged in, show verified profile card
  if (isLoggedIn && citizen && !successMsg) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {t('auth.profile', 'Citizen Profile')}
              </span>
              <h2 className="text-lg font-bold text-slate-900">{citizen.name}</h2>
              <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full">
                Verified Citizen
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              {citizen.name.slice(0, 2).toUpperCase()}
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-lg border border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Mail size={13} className="text-slate-400" />
                {t('auth.email', 'Email Address')}
              </span>
              <span className="font-semibold text-slate-800 font-mono text-[11px]">{citizen.email}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-lg border border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-slate-400" />
                {t('auth.role', 'Account Role')}
              </span>
              <span className="font-semibold text-slate-800 capitalize">Citizen</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onSuccess}
              className="flex-1 py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer text-center"
            >
              {t('report.continue', 'Continue')}
            </button>
            <button
              type="button"
              onClick={logout}
              className="py-2 px-4 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              {t('auth.logout', 'Sign Out')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      {/* Return button */}
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-4 transition-colors cursor-pointer"
      >
        <ArrowLeft size={13} />
        <span>{t('report.back', 'Back')}</span>
      </button>

      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Subtle Indian tricolor hairline indicator */}
        <div className="h-1 w-full bg-gradient-to-r from-[#FF9933] via-slate-200 to-[#138808]" />

        <div className="p-6 sm:p-7 space-y-6">
          {/* Header */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white mb-1 shadow-xs">
              {mode === 'forgot-password' ? <KeyRound size={20} /> : <ShieldCheck size={20} />}
            </div>
            <h1 className="text-lg font-bold text-slate-900">
              {mode === 'signup'
                ? t('auth.title_signup', 'Create Citizen Account')
                : mode === 'forgot-password'
                ? t('auth.title_forgot', 'Reset Password')
                : t('auth.title_login', 'Citizen Sign In')}
            </h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {mode === 'signup'
                ? t('auth.desc_signup', 'Sign up as an Indian citizen to file and track civic issues')
                : mode === 'forgot-password'
                ? t('auth.desc_forgot', 'Enter your email address to receive password reset instructions')
                : t('auth.desc_login', 'Sign in with your email and password to access your civic reports')}
            </p>
          </div>

          {/* Report Gate Notice */}
          {reason === 'report' && mode !== 'forgot-password' && (
            <div className="flex items-center gap-2.5 p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl text-amber-900 text-xs shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-amber-800">
                <Camera size={14} />
              </div>
              <div className="min-w-0 text-left">
                <div className="font-semibold text-amber-900">
                  {t('auth.report_gate_title', 'Citizen Sign In Required')}
                </div>
                <div className="text-[11px] text-amber-700 leading-tight mt-0.5">
                  {t(
                    'auth.report_gate_desc',
                    'Please sign in or create a citizen account before submitting your report.'
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mode Switcher Tabs (Login / Signup) */}
          {mode !== 'forgot-password' && (
            <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMsg(null);
                  window.location.hash = 'login';
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('auth.login', 'Sign In')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setSuccessMsg(null);
                  window.location.hash = 'signup';
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('auth.signup', 'Sign Up')}
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
              <AlertCircle size={15} className="shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SIGNUP FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('auth.name', 'Full Name')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('auth.email', 'Email Address')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rajesh.kumar@gmail.com"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('auth.password', 'Password')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              {/* Citizen role guarantee notice */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 text-[11px] text-slate-600 flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                <span>Account will be securely registered with verified <strong>Citizen</strong> privileges.</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>{t('auth.btn_create', 'Create Citizen Account')}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('auth.email', 'Email Address')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. citizen@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('auth.password', 'Password')} <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot-password');
                      setError(null);
                      setSuccessMsg(null);
                      window.location.hash = 'forgot-password';
                    }}
                    className="text-[11px] font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>{t('auth.btn_login', 'Sign In')}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot-password' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('auth.email', 'Email Address')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. your.email@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Sending reset link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Password Reset Link</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMsg(null);
                    window.location.hash = 'login';
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={12} />
                  <span>Return to Sign In</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
