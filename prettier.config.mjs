// Shared Prettier config. Prettier walks up the directory tree, so both
// frontend and backend inherit this without needing their own config files.
export default {
  endOfLine: 'auto',
  singleQuote: true,
  trailingComma: 'all',
  semi: true,
  printWidth: 100,
};
