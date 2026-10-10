// Dùng chung cho test của web/src/ui: matcher jest-dom và dọn DOM sau mỗi test (vitest không bật globals).
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());
