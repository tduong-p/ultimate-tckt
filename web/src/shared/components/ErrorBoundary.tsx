import React from 'react';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Rào chắn lỗi kết xuất để tránh màn hình trắng khi một thành phần gặp sự cố bất ngờ. */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          style={{
            maxWidth: 520,
            margin: '32px auto',
            padding: 24,
            borderRadius: 6,
            border: `1px solid ${token('color.border.danger', '#FF5630')}`,
            backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
            color: token('color.text', '#172B4D'),
          }}
        >
          <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>Đã xảy ra lỗi hiển thị</h2>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: token('color.text.subtle', '#5E6C84') }}>
            {this.state.error.message || 'Không thể hiển thị nội dung này. Vui lòng thử lại.'}
          </p>
          <Button appearance="primary" onClick={this.handleReset}>
            Thử lại
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
