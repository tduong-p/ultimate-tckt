import '@testing-library/react';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // Deprecated
    removeListener: () => {}, // Deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
global.IntersectionObserver = class IntersectionObserver { constructor() {} observe() {} unobserve() {} disconnect() {} };

global.ResizeObserver = class ResizeObserver { constructor() {} observe() {} unobserve() {} disconnect() {} };

