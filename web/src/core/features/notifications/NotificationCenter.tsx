import React from 'react';
import { NotificationBell } from './NotificationBell';
import { NotificationPopups } from './NotificationPopups';

/** Chuông + popup thông báo; đặt vào `headerExtras` của PageLayout. */
export const NotificationCenter: React.FC = () => (
  <>
    <NotificationBell />
    <NotificationPopups />
  </>
);
