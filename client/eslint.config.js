export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } }, globals: { window: 'readonly', document: 'readonly', console: 'readonly', process: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', confirm: 'readonly', prompt: 'readonly', Buffer: 'readonly' } },
    rules: { 'no-duplicate-imports': 'error', 'no-unreachable': 'error', 'no-unexpected-multiline': 'error' }
  }
];
