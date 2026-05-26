// Root ESLint config — used only for files at the repo root.
// Each workspace (frontend/, backend/) owns its own eslint.config.* that
// extends ./eslint.config.base.mjs and layers framework-specific rules.
import baseConfig from './eslint.config.base.mjs';

export default [
  {
    ignores: [
      'frontend/**',
      'backend/**',
      'scripts/**',
      'pdfs/**',
      '.starter-research/**',
      'docs/**',
    ],
  },
  ...baseConfig,
];
