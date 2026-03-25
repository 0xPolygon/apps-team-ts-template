import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.ts'],
    reporters: process.env.CI ? ['verbose'] : undefined
  }
});
