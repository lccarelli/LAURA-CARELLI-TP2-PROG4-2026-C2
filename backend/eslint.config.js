import { defineConfig } from 'eslint/config';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    extends: [sonarjs.configs.recommended],
    rules: {
      'sonarjs/no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    rules: {
      'sonarjs/hardcoded-secret-signatures': 'off',
      'sonarjs/no-hardcoded-ip': 'off',
    },
  },
  {
    files: ['test/**/*.e2e-spec.ts'],
    rules: { 'sonarjs/assertions-in-tests': 'off' },
  },
]);
