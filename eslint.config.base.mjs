// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Shared base ESLint config (flat config). Each workspace imports and extends.
// Strictness/type-aware rules + framework plugins are layered on per-package
// because they require a tsconfig path and framework-specific knowledge.
export const baseConfig = tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.vite/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);

export default baseConfig;
