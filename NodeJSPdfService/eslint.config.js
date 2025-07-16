import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        PDFDocument: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^(_|next|req|res|error|standard|options|certificate|certificates)',
        varsIgnorePattern: '^(_|path|cleanupError|pdfDoc|quality|format|includeImages|currentPageIndex|pages|originalSend|originalJson)',
        caughtErrorsIgnorePattern: '^_'
      }],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error',
      'arrow-spacing': 'error',
      'comma-dangle': ['error', 'never'],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'indent': ['error', 2],
      'no-trailing-spaces': 'error',
      'eol-last': 'error'
    }
  },
  {
    files: ['**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        expect: 'readonly',
        test: 'readonly',
        describe: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly'
      }
    }
  }
];
