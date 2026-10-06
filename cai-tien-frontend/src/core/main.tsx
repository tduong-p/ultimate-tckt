import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '../shared/styles/responsive.css';
import { PageLayout } from '../shared/layouts/PageLayout';
import { MyTasks } from './features/tasks/MyTasks';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <PageLayout>
        <MyTasks />
      </PageLayout>
    </QueryClientProvider>
  </React.StrictMode>
);
