import React from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useCapabilities } from './capabilities';
import { Dashboard } from './features/dashboard/Dashboard';
import { MyTasksToday } from './features/tasks/MyTasksToday';
import { CalendarView } from './features/calendar/CalendarView';
import { ActivitiesView } from './features/activities/ActivitiesView';
import { ActivityDetailView } from './features/activities/ActivityDetailView';
import { MyTasksView } from './features/tasks/MyTasksView';
import { TeamsView } from './features/teams/TeamsView';
import { MembersView } from './features/members/MembersView';
import { DocumentsView } from './features/documents/DocumentsView';
import { ReportsView } from './features/reports/ReportsView';
import { ArchiveView } from './features/archive/ArchiveView';
import { NotFoundView } from './features/notFound/NotFoundView';

const ToDashboard = () => <Navigate to="/dashboard" replace />;

/** Bảng route theo đường dẫn của UI cũ (`#dashboard`, `#calendar`…). Route không có quyền về Tổng quan. */
export const AppRoutes: React.FC<{ userName: string }> = ({ userName }) => {
  const caps = useCapabilities();
  const navigate = useNavigate();
  return (
    <Routes>
      <Route path="/" element={<ToDashboard />} />
      <Route path="/dashboard" element={<Dashboard userName={userName} onNavigate={(view) => navigate(`/${view}`)} />} />
      <Route path="/my-tasks-today" element={<MyTasksToday />} />
      <Route path="/calendar" element={<CalendarView />} />
      <Route path="/activities" element={<ActivitiesView />} />
      <Route path="/activity/:id" element={<ActivityDetailView />} />
      <Route path="/my-tasks" element={<MyTasksView />} />
      <Route path="/teams" element={<TeamsView />} />
      <Route path="/people" element={<MembersView />} />
      <Route path="/documents" element={<DocumentsView />} />
      <Route path="/reports" element={caps.isManager ? <ReportsView /> : <ToDashboard />} />
      <Route path="/archive" element={<ArchiveView />} />
      <Route path="*" element={<NotFoundView />} />
    </Routes>
  );
};
