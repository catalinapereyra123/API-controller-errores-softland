export default {
  'backend/**/*.ts': () => [
    'npm --prefix backend run lint',
    'npm --prefix backend run format',
  ],
  'frontend/**/*.{ts,tsx,css}': () => [
    'npm --prefix frontend run lint:fix',
    'npm --prefix frontend run format',
  ],
}
