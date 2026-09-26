import { useEffect, useState } from 'react';
import type { Complaint } from './types/complaint';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CitizenHome } from './pages/CitizenHome';
import { ReportFlow } from './pages/ReportFlow';
import { MyReports } from './pages/MyReports';
import { AuthorityDashboard } from './pages/AuthorityDashboard';
import { AuthPage } from './pages/AuthPage';
import { useAuth } from './context/AuthContext';

type ViewMode = 'home' | 'report' | 'my-reports' | 'authority' | 'auth';

export function App() {
  const { isLoggedIn } = useAuth();
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [previousView, setPreviousView] = useState<ViewMode>('home');
  const [authReturnTo, setAuthReturnTo] = useState<ViewMode | null>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  // Sync with browser hash if user navigates via URL
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'report') {
        if (!isLoggedIn) {
          setAuthReturnTo('report');
          setCurrentView('auth');
          return;
        }
        setCurrentView('report');
      } else if (hash === 'authority' || hash === 'my-reports') {
        setCurrentView(hash as ViewMode);
      } else if (hash === 'auth' || hash === 'login' || hash === 'signup') {
        setCurrentView('auth');
      } else {
        setCurrentView('home');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isLoggedIn]);

  const navigateTo = (view: ViewMode) => {
    // Intercept report view if citizen is not authenticated
    if (view === 'report' && !isLoggedIn) {
      setAuthReturnTo('report');
      setPreviousView(currentView !== 'auth' ? currentView : 'home');
      setCurrentView('auth');
      window.location.hash = 'auth';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view !== 'auth') {
      setPreviousView(view);
    }
    setCurrentView(view);
    window.location.hash = view === 'home' ? '' : view;
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
              navigateTo('auth');
            }}
          />
        )}

        {currentView === 'my-reports' && (
          <MyReports
            onStartNewReport={() => navigateTo('report')}
            selectedComplaintId={selectedComplaintId}
          />
        )}

        {currentView === 'authority' && <AuthorityDashboard />}

        {currentView === 'auth' && (
          <AuthPage
            initialMode="signup"
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
