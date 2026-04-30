import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      eqeqeq: ['error', 'always'],
      'no-duplicate-imports': ['error', { includeExports: true }],

      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',

      'no-unused-expressions': 'error',
      complexity: ['warn', 20],

      'indent': ['error', 2, { 'SwitchCase': 1 }],
      quotes: ['error', 'single'],
      'no-multi-spaces': 'error',
      'linebreak-style': 'error',
      'object-curly-spacing': ['error', 'always'],
      'eol-last': 'error',
      'comma-dangle': ['error', 'always-multiline'],
      // 'nonblock-statement-body-position': ['error', 'single']
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'components/ui/**',
  ]),
]);

export default eslintConfig;
