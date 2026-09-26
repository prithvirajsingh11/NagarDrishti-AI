import { useEffect, useState } from 'react';
import type { Complaint } from './types/complaint';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CitizenHome } from './pages/CitizenHome';
import { ReportFlow } from './pages/ReportFlow';
import { MyReports } from './pages/MyReports';
import { AuthorityDashboard } from './pages/AuthorityDashboard';
import { AuthPage } from './pages/AuthPage';

type ViewMode = 'home' | 'report' | 'my-reports' | 'authority' | 'auth';

export function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [previousView, setPreviousView] = useState<ViewMode>('home');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  // Sync with browser hash if user navigates via URL
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'authority' || hash === 'report' || hash === 'my-reports') {
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
  }, []);

  const navigateTo = (view: ViewMode) => {
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
            onSuccess={() => navigateTo(previousView === 'auth' ? 'home' : previousView)}
            onCancel={() => navigateTo(previousView === 'auth' ? 'home' : previousView)}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
