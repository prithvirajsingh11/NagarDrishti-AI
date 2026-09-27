import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Complaint } from './types/complaint';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CitizenHome } from './pages/CitizenHome';
import { ReportFlow } from './pages/ReportFlow';
import { MyReports } from './pages/MyReports';
import { AuthPage, type AuthMode } from './pages/AuthPage';
import { useAuth } from './context/AuthContext';

type ViewMode = 'home' | 'report' | 'my-reports' | 'auth';

export function App() {
  const { isLoggedIn, loading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [previousView, setPreviousView] = useState<ViewMode>('home');
  const [authReturnTo, setAuthReturnTo] = useState<ViewMode | null>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

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
      } else if (hash === 'login') {
        setAuthMode('login');
        setCurrentView('auth');
      } else if (hash === 'signup') {
        setAuthMode('signup');
        setCurrentView('auth');
      } else if (hash === 'forgot-password') {
        setAuthMode('forgot-password');
        setCurrentView('auth');
      } else if (hash === 'auth') {
        setCurrentView('auth');
      } else {
        setCurrentView('home');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isLoggedIn, loading]);

  const navigateTo = (view: ViewMode, mode?: AuthMode) => {
    if (mode) {
      setAuthMode(mode);
    }

    // Intercept protected views if citizen is not authenticated
    if ((view === 'report' || view === 'my-reports') && !isLoggedIn) {
      setAuthReturnTo(view);
      setAuthMode(mode || 'login');
      setPreviousView(currentView !== 'auth' ? currentView : 'home');
      setCurrentView('auth');
      window.location.hash = mode || 'login';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view !== 'auth') {
      setPreviousView(view);
    }
    setCurrentView(view);
    window.location.hash = view === 'home' ? '' : mode || view;
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
          <span className="text-xs font-medium text-slate-500">Initializing NagarDrishti AI...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-slate-900">
      <Navbar currentView={currentView} onNavigate={navigateTo} />

      <main className="flex-1 pb-12">
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

        {currentView === 'auth' && (
          <AuthPage
            initialMode={authMode}
            reason={authReturnTo === 'report' ? 'report' : 'default'}
            onSuccess={() => {
              const dest = authReturnTo || (previousView === 'auth' ? 'home' : previousView);
              setAuthReturnTo(null);
              navigateTo(dest);
            }}
            onCancel={() => {
              setAuthReturnTo(null);
              navigateTo(previousView === 'auth' ? 'home' : previousView);
            }}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
