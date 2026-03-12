import { recommended, javascript, typescript, frontend } from '@polygonlabs/apps-team-lint';

export default [
  ...recommended(),
  ...javascript({ globals: 'node' }),
  ...typescript({ globals: 'node', tsconfigRootDir: import.meta.dirname }),
  ...frontend().map((config) => ({
    ...config,
    files: (config.files ?? ['**/*.{ts,tsx,js,jsx,mjs,cjs}']).map(
      (pattern) => `packages/example-frontend/${pattern}`
    )
  })),
  { ignores: ['.claude/**', '**/dist/**'] }
];
