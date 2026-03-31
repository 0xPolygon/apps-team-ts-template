import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.ts'],
    ...(process.env.CI ? { reporters: ['verbose'] as const } : {})
  }
});
