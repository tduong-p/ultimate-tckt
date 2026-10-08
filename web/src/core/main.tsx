import React from 'react';
import ReactDOM from 'react-dom/client';
import AppProvider from '@atlaskit/app-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@atlaskit/css-reset';
import '../shared/styles/responsive.css';
import { PageLayout } from '../shared/layouts/PageLayout';
import { Dashboard } from './features/dashboard/Dashboard';
import { MyTasksToday } from './features/tasks/MyTasksToday';
import { CalendarView } from './features/calendar/CalendarView';

const queryClient = new QueryClient();

const App = () => {
  const [currentView, setCurrentView] = React.useState('calendar');
  return (
    <PageLayout currentView={currentView} onNavigate={setCurrentView}>
      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'my-tasks-today' && <MyTasksToday />}
      {currentView === 'calendar' && <CalendarView />}
    </PageLayout>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </AppProvider>
  </React.StrictMode>
);
