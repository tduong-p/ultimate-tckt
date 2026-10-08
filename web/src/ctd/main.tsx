import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import AppProvider from '@atlaskit/app-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@atlaskit/css-reset';
import '../shared/styles/responsive.css';

import { CtdLayout } from './layouts/CtdLayout';
import { InboxView } from './features/inbox/InboxView';
import { ReviewCaseView } from './features/review/ReviewCaseView';
import { CtdDashboardView } from './features/dashboard/CtdDashboardView';
import { StudentCaseView } from './features/student/StudentCaseView';
import { INITIAL_CASES, CtdCase } from './data/ctdMockData';

const queryClient = new QueryClient();

export const CtdApp: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<'can_bo' | 'sinh_vien'>('can_bo');
  const [currentView, setCurrentView] = useState('inbox');
  const [selectedCaseId, setSelectedCaseId] = useState<number>(1);
  const [cases, setCases] = useState<CtdCase[]>(INITIAL_CASES);

  const handleRoleChange = (role: 'can_bo' | 'sinh_vien') => {
    setCurrentRole(role);
    if (role === 'sinh_vien') {
      setCurrentView('student-case');
    } else {
      setCurrentView('inbox');
    }
  };

  const handleSelectCase = (id: number) => {
    setSelectedCaseId(id);
    setCurrentView('review');
  };

  const handleUpdateStatus = (caseId: number, newStatus: any) => {
    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              status: newStatus,
              daysInStatus: 0,
            }
          : c
      )
    );
  };

  const selectedCase = cases.find((c) => c.id === selectedCaseId) || cases[0];
  const studentCase = cases[0]; // Sample student case (Nguyễn Minh Anh)

  return (
    <CtdLayout
      currentRole={currentRole}
      onRoleChange={handleRoleChange}
      currentView={currentView}
      onNavigate={setCurrentView}
    >
      {currentView === 'inbox' && (
        <InboxView cases={cases} onSelectCase={handleSelectCase} />
      )}
      {currentView === 'review' && (
        <ReviewCaseView
          caseData={selectedCase}
          onBack={() => setCurrentView('inbox')}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
      {currentView === 'dashboard' && <CtdDashboardView />}
      {currentView === 'student-case' && (
        <StudentCaseView myCase={studentCase} initialMode="status" />
      )}
      {currentView === 'student-submit' && (
        <StudentCaseView myCase={studentCase} initialMode="submit" />
      )}
    </CtdLayout>
  );
};

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <AppProvider>
        <QueryClientProvider client={queryClient}>
          <CtdApp />
        </QueryClientProvider>
      </AppProvider>
    </React.StrictMode>
  );
}
