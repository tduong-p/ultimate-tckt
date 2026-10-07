import { render } from '@testing-library/react';
import { PageLayout } from './PageLayout';
import { describe, it, expect } from 'vitest';

describe('PageLayout', () => {
  it('renders without crashing', () => {
    const { container } = render(<PageLayout><div>Test</div></PageLayout>);
    expect(container).toBeDefined();
  });
});
