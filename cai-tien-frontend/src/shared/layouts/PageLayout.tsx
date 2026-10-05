import React from 'react';
import '@atlaskit/css-reset';
import { token } from '@atlaskit/tokens';

export const PageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: token('color.background.neutral.subtle', '#F4F5F7') }}>
      {/* Top Navigation */}
      <header style={{ 
        backgroundColor: token('color.background.brand.bold', '#0052CC'), 
        padding: `0 ${token('space.300', '24px')}`, 
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        boxShadow: token('elevation.shadow.raised', '0 1px 2px rgba(0,0,0,0.2)')
      }}>
        <h1 style={{ color: token('color.text.inverse', '#FFFFFF'), margin: 0, fontSize: '20px', fontWeight: 500 }}>
          Ultimate TCKT
        </h1>
      </header>
      
      {/* Main Content Area */}
      <main style={{ padding: token('space.400', '32px'), flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1200px' }}>
          {children}
        </div>
      </main>
    </div>
  );
};
