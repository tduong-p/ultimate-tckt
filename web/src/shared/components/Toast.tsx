import React from 'react';
import { FlagsProvider, useFlags } from '@atlaskit/flag';
import { token } from '@atlaskit/tokens';
import SuccessIcon from '@atlaskit/icon/core/status-success';
import ErrorIcon from '@atlaskit/icon/core/status-error';
import InfoIcon from '@atlaskit/icon/core/status-information';

export interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = React.createContext<ToastApi | null>(null);

const ToastBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showFlag } = useFlags();
  const api = React.useMemo<ToastApi>(() => ({
    success: (message) => {
      showFlag({ title: message, isAutoDismiss: true, icon: <SuccessIcon label="Thành công" color={token('color.icon.success')} /> });
    },
    error: (message) => {
      showFlag({ title: message, isAutoDismiss: true, icon: <ErrorIcon label="Lỗi" color={token('color.icon.danger')} /> });
    },
    info: (message) => {
      showFlag({ title: message, isAutoDismiss: true, icon: <InfoIcon label="Thông tin" color={token('color.icon.information')} /> });
    },
  }), [showFlag]);
  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
};

/** Thông báo ngắn góc màn hình (Atlaskit flag), tự ẩn. */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FlagsProvider>
    <ToastBridge>{children}</ToastBridge>
  </FlagsProvider>
);

export function useToast(): ToastApi {
  const api = React.useContext(ToastContext);
  if (!api) throw new Error('useToast phải dùng bên trong ToastProvider');
  return api;
}
