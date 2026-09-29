import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Complaint } from './types/complaint';
import { Navbar } from './components/Navbar';
import { Sidebar, type NavView } from './components/Sidebar';
import { Footer } from './components/Footer';
import { CitizenHome } from './pages/CitizenHome';
import { ReportFlow } from './pages/ReportFlow';
import { MyReports } from './pages/MyReports';
import { CivicMap } from './pages/CivicMap';
import { HelpSupport } from './pages/HelpSupport';
import { AuthPage, type AuthMode } from './pages/AuthPage';
import { useAuth } from './context/AuthContext';

export function App() {
  const { isLoggedIn, loading } = useAuth();
  // Default to 'report' if hash specifies or let user start on 'report' to directly match screenshot
  const [currentView, setCurrentView] = useState<NavView>('report');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [previousView, setPreviousView] = useState<NavView>('report');
  const [authReturnTo, setAuthReturnTo] = useState<NavView | null>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  // Sync with browser hash if user navigates via URL
  useEffect(() => {
    if (loading) return; // Wait until initial session resolution to avoid flashing

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();

      if (hash === 'report') {
        if (!isLoggedIn) {
          setAuthReturnTo('report');
          setAuthMode('login');
          setCurrentView('auth');
          return;
        }
        setCurrentView('report');
      } else if (hash === 'my-reports') {
        if (!isLoggedIn) {
          setAuthReturnTo('my-reports');
          setAuthMode('login');
          setCurrentView('auth');
          return;
        }
        setCurrentView('my-reports');
      } else if (hash === 'map') {
        setCurrentView('map');
      } else if (hash === 'help') {
        setCurrentView('help');
      } else if (hash === 'home') {
        setCurrentView('home');
      } else if (
        hash === 'login' ||
        hash === 'signup' ||
        hash === 'forgot-password' ||
        hash === 'auth'
      ) {
        if (isLoggedIn) {
          // Citizen is already authenticated: transition out of auth immediately
          const dest = authReturnTo || (previousView === 'auth' ? 'report' : previousView);
          setAuthReturnTo(null);
          setCurrentView(dest);
          if (window.location.hash) {
            window.location.hash = dest;
          }
          return;
        }
        if (hash === 'signup') setAuthMode('signup');
        else if (hash === 'forgot-password') setAuthMode('forgot-password');
        else setAuthMode('login');
        setCurrentView('auth');
      } else {
        // Default to report to present the requested civic reporting UI
        setCurrentView('report');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isLoggedIn, loading, authReturnTo, previousView]);

  // Reactive auto-redirect: whenever authenticated citizen is on 'auth' view, immediately redirect
  useEffect(() => {
    if (!loading && isLoggedIn && currentView === 'auth') {
      const dest = authReturnTo || (previousView === 'auth' ? 'report' : previousView);
      setAuthReturnTo(null);
      setCurrentView(dest);
      window.location.hash = dest;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isLoggedIn, loading, currentView, authReturnTo, previousView]);

  const navigateTo = (view: NavView, mode?: AuthMode) => {
    if (mode) {
      setAuthMode(mode);
    }

    // Intercept protected views if citizen is not authenticated
    if ((view === 'report' || view === 'my-reports') && !isLoggedIn) {
      setAuthReturnTo(view);
      setAuthMode(mode || 'login');
      setPreviousView(currentView !== 'auth' ? currentView : 'report');
      setCurrentView('auth');
      window.location.hash = mode || 'login';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // If citizen is logged in and tries to navigate to auth, redirect to destination
    if (view === 'auth' && isLoggedIn) {
      const dest = authReturnTo || (previousView === 'auth' ? 'report' : previousView);
      setAuthReturnTo(null);
      setCurrentView(dest);
      window.location.hash = dest;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view !== 'auth') {
      setPreviousView(view);
    }
    setCurrentView(view);
    window.location.hash = view;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReportSuccess = (complaint: Complaint) => {
    setSelectedComplaintId(complaint.id);
    navigateTo('my-reports');
  };

  const handleSelectComplaintFromFeed = (complaint: Complaint) => {
    setSelectedComplaintId(complaint.id);
    navigateTo('my-reports');
  };

  // Prevent flash of protected content while initial session restores
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" />
          <span className="text-xs font-semibold text-slate-500">
            Initializing NagarDrishti AI...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD] text-slate-900 font-sans antialiased">
      {/* Top Header Navbar */}
      <Navbar currentView={currentView} onNavigate={navigateTo} />

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 max-w-[1520px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar (visible on desktop) */}
        {currentView !== 'auth' && (
          <Sidebar
            currentView={currentView}
            onNavigate={navigateTo}
            className="hidden lg:flex"
          />
        )}

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          {currentView === 'home' && (
            <CitizenHome
              onStartReport={() => navigateTo('report')}
              onSelectComplaint={handleSelectComplaintFromFeed}
            />
          )}

          {currentView === 'report' && (
            <ReportFlow
              onCancel={() => navigateTo('home')}
              onSuccess={handleReportSuccess}
              onRequireAuth={() => {
                setAuthReturnTo('report');
                setAuthErrorMessage('Please sign in or register to report civic issues.');
                navigateTo('auth', 'login');
              }}
            />
          )}

          {currentView === 'my-reports' && (
            <MyReports
              onStartNewReport={() => navigateTo('report')}
              selectedComplaintId={selectedComplaintId}
            />
          )}

          {currentView === 'map' && (
            <CivicMap onReportNew={() => navigateTo('report')} />
          )}

          {currentView === 'help' && <HelpSupport />}

          {currentView === 'auth' && (
            <AuthPage
              initialMode={authMode}
              reason={authReturnTo === 'report' ? 'report' : 'default'}
              initialError={authErrorMessage}
              onSuccess={() => {
                setAuthErrorMessage(null);
                const dest = authReturnTo || (previousView === 'auth' ? 'report' : previousView);
                setAuthReturnTo(null);
                navigateTo(dest);
              }}
              onCancel={() => {
                setAuthErrorMessage(null);
                setAuthReturnTo(null);
                navigateTo(previousView === 'auth' ? 'report' : previousView);
              }}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
