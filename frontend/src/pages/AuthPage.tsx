import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  Camera,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
  reason?: 'report' | 'default';
  onSuccess: () => void;
  onCancel: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'signup',
  reason = 'default',
  onSuccess,
  onCancel,
}) => {
  const { t } = useLanguage();
  const { signup, login, quickDemoLogin, citizen, isLoggedIn, logout } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAge = parseInt(age, 10);
    if (!name.trim()) {
      setError(t('auth.err_name', 'Please enter your full name.'));
      return;
    }
    if (!age || isNaN(parsedAge) || parsedAge < 10 || parsedAge > 120) {
      setError(t('auth.err_age', 'Please enter a valid age between 10 and 120.'));
      return;
    }
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setError(t('auth.err_email', 'Please enter a valid Gmail / email address.'));
      return;
    }
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setError(t('auth.err_phone', 'Please enter a valid 10-digit mobile number.'));
      return;
    }

    const res = signup({
      name: name.trim(),
      age: parsedAge,
      email: email.trim(),
      phone: cleanPhone,
    });

    if (res.success) {
      setSuccessMsg(t('auth.signup_success', 'Account created successfully! Welcome to NagarDrishti AI.'));
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } else {
      setError(res.error || 'Failed to create account.');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!loginIdentifier.trim()) {
      setError(t('auth.err_login_id', 'Please enter your registered Gmail or phone number.'));
      return;
    }

    const res = login(loginIdentifier.trim());
    if (res.success) {
      setSuccessMsg(t('auth.login_success', 'Welcome back! Signed in successfully.'));
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } else {
      setError(res.error || 'Could not find account. Please verify or sign up.');
    }
  };

  const handleDemoClick = () => {
    quickDemoLogin();
    setSuccessMsg(t('auth.demo_success', 'Signed in as Demo Citizen (Rajesh Kumar).'));
    setTimeout(() => {
      onSuccess();
    }, 900);
  };

  // If already logged in, show profile card and option to switch or logout
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
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              {citizen.name.slice(0, 2).toUpperCase()}
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-lg border border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" />
                {t('auth.age', 'Age')}
              </span>
              <span className="font-semibold text-slate-800">{citizen.age} {t('auth.years_old', 'years')}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-lg border border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Mail size={13} className="text-slate-400" />
                {t('auth.email', 'Gmail / Email')}
              </span>
              <span className="font-semibold text-slate-800 font-mono text-[11px]">{citizen.email}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50/80 rounded-lg border border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Phone size={13} className="text-slate-400" />
                {t('auth.phone', 'Phone Number')}
              </span>
              <span className="font-semibold text-slate-800 font-mono text-[11px]">+91 {citizen.phone}</span>
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
              <ShieldCheck size={20} />
            </div>
            <h1 className="text-lg font-bold text-slate-900">
              {mode === 'signup'
                ? t('auth.title_signup', 'Create Citizen Account')
                : t('auth.title_login', 'Citizen Sign In')}
            </h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {mode === 'signup'
                ? t('auth.desc_signup', 'Enter your personal details to file and track civic reports')
                : t('auth.desc_login', 'Sign in with your registered Gmail or phone number')}
            </p>
          </div>

          {/* Report Gate Notice */}
          {reason === 'report' && (
            <div className="flex items-center gap-2.5 p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl text-amber-900 text-xs shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-amber-800">
                <Camera size={14} />
              </div>
              <div className="min-w-0 text-left">
                <div className="font-semibold text-amber-900">
                  {t('auth.report_gate_title', 'Citizen Sign In Required')}
                </div>
                <div className="text-[11px] text-amber-700 leading-tight mt-0.5">
                  {t('auth.report_gate_desc', 'Please sign in or create an account with your Gmail & phone number before reporting a civic issue.')}
                </div>
              </div>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('auth.signup', 'Sign Up')}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t('auth.login', 'Log In')}
            </button>
          </div>

          {/* Alert / Feedback */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-xs border border-red-200">
              <AlertCircle size={15} className="shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs border border-emerald-200">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SIGN UP FORM */}
          {mode === 'signup' ? (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('auth.name', 'Full Name')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('auth.name_placeholder', 'e.g. Rajesh Kumar')}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Age */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('auth.age', 'Age')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    required
                    min={10}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder={t('auth.age_placeholder', 'e.g. 28')}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Gmail / Email */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center justify-between">
                  <span>{t('auth.email', 'Gmail / Email')} <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Gmail supported</span>
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.email_placeholder', 'e.g. yourname@gmail.com')}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('auth.phone', 'Phone Number')} <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-600 bg-slate-200/80 px-1.5 py-0.5 rounded">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder={t('auth.phone_placeholder', '10-digit mobile number')}
                    className="w-full pl-14 pr-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-500 focus:bg-white font-mono transition-colors"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>{t('auth.btn_signup', 'Create Account')}</span>
                <ArrowRight size={14} />
              </button>
            </form>
          ) : (
            /* LOG IN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t('auth.email', 'Gmail / Email')} or {t('auth.phone', 'Phone Number')}
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder={t('auth.login_input_placeholder', 'Enter your Gmail or 10-digit mobile')}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-500 focus:bg-white transition-colors"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  You can enter your registered Gmail address or 10-digit mobile number.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>{t('auth.btn_login', 'Sign In')}</span>
                <ArrowRight size={14} />
              </button>

              {/* Quick Demo Login Option */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDemoClick}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200/80"
                >
                  <Sparkles size={13} className="text-amber-600" />
                  <span>{t('auth.demo_btn', 'Try Quick Demo Account')}</span>
                </button>
              </div>
            </form>
          )}

          {/* Bottom Switcher */}
          <div className="pt-3 border-t border-slate-100 text-center">
            {mode === 'signup' ? (
              <p className="text-xs text-slate-500">
                {t('auth.have_account', 'Already registered?')}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="text-slate-900 font-semibold hover:underline cursor-pointer ml-1"
                >
                  {t('auth.login', 'Log In')}
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                {t('auth.no_account', "Don't have an account?")}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className="text-slate-900 font-semibold hover:underline cursor-pointer ml-1"
                >
                  {t('auth.signup', 'Sign Up')}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
