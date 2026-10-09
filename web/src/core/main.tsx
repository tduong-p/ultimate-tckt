import React from 'react';
import ReactDOM from 'react-dom/client';
import AppProvider from '@atlaskit/app-provider';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import '@atlaskit/css-reset';
import '../shared/styles/responsive.css';
import { LottieLoading } from '../shared/components/LottieLoading';
import { PageLayout } from '../shared/layouts/PageLayout';
import { LoginView } from './features/auth/LoginView';
import { OnboardingView } from './features/auth/OnboardingView';
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
import { fetchBootstrap, fetchSession, logoutUser, type SessionData, type SessionUser } from './api';
import { BOOTSTRAP_KEY, SESSION_KEY } from './queryKeys';

// Bỏ mọi dữ liệu của người dùng cũ rồi đánh dấu chưa đăng nhập để App hiện màn đăng nhập.
function resetToLoggedOut(queryClient: QueryClient) {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== SESSION_KEY[0] });
  queryClient.setQueryData(SESSION_KEY, { user: null });
}

function isUnauthorized(error: unknown): boolean {
  return httpStatus(error) === 401;
}

function httpStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status;
}

// 4xx (hết phiên, không có quyền, dữ liệu sai) thử lại cũng vô ích; chỉ thử lại lỗi máy chủ/mạng.
function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = httpStatus(error);
  if (status !== undefined && status < 500) return false;
  return failureCount < 2;
}

export function createCoreQueryClient(): QueryClient {
  const onError = (error: unknown) => {
    if (isUnauthorized(error)) resetToLoggedOut(queryClient);
  };
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: { queries: { retry: shouldRetry } },
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

  const isSignedIn = Boolean(session?.user) && !session?.user?.onboarding?.required;
  // Dùng chung cache với Dashboard; quyền xem Báo cáo trùng quyền điều hành (middleware `manager`).
  const { data: bootstrap } = useQuery({
    queryKey: BOOTSTRAP_KEY,
    queryFn: fetchBootstrap,
    enabled: isSignedIn,
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

  if (session.user.onboarding?.required) {
    const handleOnboardingDone = (user: SessionUser) => {
      queryClient.setQueryData<SessionData>(SESSION_KEY, (prev) => (prev ? { ...prev, user } : prev));
    };
    return <OnboardingView user={session.user} onDone={handleOnboardingDone} />;
  }

  return (
    <PageLayout
      currentView={currentView}
      onNavigate={setCurrentView}
      user={session.user}
      onLogout={handleLogout}
      canViewReports={Boolean(bootstrap?.capabilities?.canCreateActivity)}
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
