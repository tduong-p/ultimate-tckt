import React from 'react';
import ReactDOM from 'react-dom/client';
import AppProvider from '@atlaskit/app-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@atlaskit/css-reset';
import '../shared/styles/responsive.css';
import { PageLayout } from '../shared/layouts/PageLayout';
import { Dashboard } from './features/dashboard/Dashboard';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <QueryClientProvider client={queryClient}>
        <PageLayout>
          <Dashboard />
        </PageLayout>
      </QueryClientProvider>
    </AppProvider>
  </React.StrictMode>
);
