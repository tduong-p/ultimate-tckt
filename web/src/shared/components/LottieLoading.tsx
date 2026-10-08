import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { token } from '@atlaskit/tokens';

export interface LottieLoadingProps {
  size?: number | string;
  message?: string;
  fullScreen?: boolean;
}

export const LottieLoading: React.FC<LottieLoadingProps> = ({
  size = 160,
  message = 'Đang tải...',
  fullScreen = false,
}) => {
  return (
    <div
      data-testid="lottie-loading"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        ...(fullScreen
          ? {
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: token('elevation.surface', '#FFFFFF'),
              zIndex: 9999,
            }
          : {
              padding: '24px',
              width: '100%',
              height: '100%',
              minHeight: '200px',
            }),
      }}
    >
      <div style={{ width: size, height: size, maxWidth: '100%', maxHeight: '100%' }}>
        <DotLottieReact src="/loading.json" loop autoplay />
      </div>
      {message && (
        <p
          style={{
            marginTop: '12px',
            fontSize: '14px',
            fontWeight: 500,
            color: token('color.text.subtle', '#42526E'),
            letterSpacing: '-0.01em',
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
};
