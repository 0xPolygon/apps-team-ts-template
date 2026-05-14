import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest doesn't auto-cleanup React Testing Library renders between
// tests by default; without this each test's render accumulates in
// the same JSDOM document and `screen.getByTestId(...)` returns the
// "Found multiple elements" error. Auto-cleanup belongs in setup so
// every test file inherits it.
afterEach(() => {
  cleanup();
});
