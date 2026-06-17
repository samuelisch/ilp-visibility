export default {
  endOfLine: 'auto',
  singleQuote: true,
  trailingComma: 'all',
  semi: true,
  printWidth: 100,
  plugins: ['prettier-plugin-tailwindcss'],
  // Tailwind v4 is CSS-first: point the sorter at the stylesheet that imports tailwind.
  tailwindStylesheet: './frontend/src/index.css',
};
