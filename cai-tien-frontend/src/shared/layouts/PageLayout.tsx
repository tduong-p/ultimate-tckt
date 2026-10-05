import React from 'react';
import '@atlaskit/css-reset';
import { token } from '@atlaskit/tokens';

export const PageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div style={{ padding: token('space.200', '16px'), backgroundColor: token('color.background.default', '#FFF'), minHeight: '100vh' }}>
      <header style={{ marginBottom: token('space.300', '24px') }}>
        <h1 style={{ color: token('color.text', '#172B4D') }}>Ultimate TCKT</h1>
      </header>
      <main>{children}</main>
    </div>
  );
};
