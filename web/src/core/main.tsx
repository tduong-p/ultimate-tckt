import React from 'react';
import ReactDOM from 'react-dom/client';
import AppProvider from '@atlaskit/app-provider';
import { QueryCache, QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import '@atlaskit/css-reset';
import '../shared/styles/responsive.css';
import { LottieLoading } from '../shared/components/LottieLoading';
import { PageLayout } from '../shared/layouts/PageLayout';
import { LoginView } from './features/auth/LoginView';
import { Dashboard } from './features/dashboard/Dashboard';
import { MyTasksToday } from './features/tasks/MyTasksToday';
import { CalendarView } from './features/calendar/CalendarView';
import { ActivitiesView } from './features/activities/ActivitiesView';
import { MyTasksView } from './features/tasks/MyTasksView';
import { TeamsView } from './features/teams/TeamsView';
import { MembersView } from './features/members/MembersView';
import { DocumentsView } from './features/documents/DocumentsView';
import { ReportsView } from './features/reports/ReportsView';
import { ArchiveView } from './features/archive/ArchiveView';
import { fetchSession, logoutUser } from './api';

const SESSION_KEY = ['session'];

// Bỏ mọi dữ liệu của người dùng cũ rồi đánh dấu chưa đăng nhập để App hiện màn đăng nhập.
function resetToLoggedOut(queryClient: QueryClient) {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== SESSION_KEY[0] });
  queryClient.setQueryData(SESSION_KEY, { user: null });
}

function isUnauthorized(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 401;
}

export function createCoreQueryClient(): QueryClient {
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (isUnauthorized(error)) resetToLoggedOut(queryClient);
      },
    }),
  });
  return queryClient;
}

const defaultQueryClient = createCoreQueryClient();

export const App = () => {
  const [currentView, setCurrentView] = React.useState('dashboard');
  const queryClient = useQueryClient();

  const { data: session, isLoading, refetch } = useQuery({
    queryKey: SESSION_KEY,
    queryFn: fetchSession,
  });

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // ignore
    }
    resetToLoggedOut(queryClient);
  };

  const handleLoginSuccess = () => {
    refetch();
  };

  if (isLoading) {
    return <LottieLoading fullScreen message="Đang tải không gian làm việc..." size={180} />;
  }

  if (!session?.user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <PageLayout
      currentView={currentView}
      onNavigate={setCurrentView}
      user={session.user}
      onLogout={handleLogout}
    >
      {currentView === 'dashboard' && <Dashboard userName={session.user.name} onNavigate={setCurrentView} />}
      {currentView === 'my-tasks-today' && <MyTasksToday />}
      {currentView === 'calendar' && <CalendarView />}
      {currentView === 'activities' && <ActivitiesView />}
      {currentView === 'my-tasks' && <MyTasksView />}
      {currentView === 'teams' && <TeamsView />}
      {currentView === 'members' && <MembersView />}
      {currentView === 'documents' && <DocumentsView />}
      {currentView === 'reports' && <ReportsView />}
      {currentView === 'archive' && <ArchiveView />}
    </PageLayout>
  );
};

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <AppProvider>
        <QueryClientProvider client={defaultQueryClient}>
          <App />
        </QueryClientProvider>
      </AppProvider>
    </React.StrictMode>
  );
}
