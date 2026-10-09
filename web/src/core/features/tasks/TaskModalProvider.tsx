import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { TaskDetailModal } from './TaskDetailModal';

export interface TaskModalApi {
  open: (taskId: number, options?: { focusSubmit?: boolean }) => void;
  close: () => void;
}

/** Mặc định no-op để màn dùng được (và test được) khi không có provider. */
export const TaskModalContext = createContext<TaskModalApi>({ open: () => {}, close: () => {} });
export const useTaskModal = (): TaskModalApi => useContext(TaskModalContext);

/** Giữ hộp chi tiết công việc; phải nằm trong Router. Mở từ mọi danh sách bằng `useTaskModal().open(id)`. */
export const TaskModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [current, setCurrent] = useState<{ taskId: number; focusSubmit: boolean } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const open = useCallback((taskId: number, options?: { focusSubmit?: boolean }) => {
    setCurrent({ taskId, focusSubmit: Boolean(options?.focusSubmit) });
  }, []);
  const close = useCallback(() => {
    setCurrent(null);
    if (location.pathname.startsWith('/task/')) navigate('/dashboard', { replace: true });
  }, [location.pathname, navigate]);
  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <TaskModalContext.Provider value={value}>
      {children}
      {current && <TaskDetailModal taskId={current.taskId} focusSubmit={current.focusSubmit} onClose={close} />}
    </TaskModalContext.Provider>
  );
};

/** Route `#task/:id`: mở hộp công việc trên nền là `children` (Tổng quan). */
export const TaskRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { id } = useParams();
  const taskId = Number(id);
  const { open } = useTaskModal();
  const valid = Number.isInteger(taskId) && taskId > 0;
  useEffect(() => {
    if (valid) open(taskId);
  }, [valid, taskId, open]);
  if (!valid) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
