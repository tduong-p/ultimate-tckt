import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PageLayout } from '../shared/layouts/PageLayout';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <PageLayout>
        <h2>Core Dashboard (Placeholder)</h2>
      </PageLayout>
    </QueryClientProvider>
  </React.StrictMode>
);
