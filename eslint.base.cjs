// Rules shared by server and shared. Each package passes its own directory so
// type-aware rules use that package's tsconfig.
module.exports = function eslintConfig(tsconfigRootDir) {
  return {
    root: true,
    env: {
      node: true,
      es2021: true,
    },
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
    ],
    ignorePatterns: [
      '.eslintrc.js',
      'dist',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      project: true,
      tsconfigRootDir,
    },
    plugins: [
      '@typescript-eslint',
    ],
    rules: {
      // Default and namespace imports keep `from` on the same line.
      // `import { ... }` is still limited, so those names can wrap.
      'max-len': ['error', {
        code: 100,
        ignoreUrls: true,
        ignorePattern: '^import\\s+(?:type\\s+)?(?:\\w+|\\*\\s+as\\s+\\w+)\\s+from\\s+[\'"]',
      }],
      'quotes': [
        'error',
        'single',
        { avoidEscape: true },
      ],
      'eqeqeq': [
        'error',
        'always',
      ],
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      'no-unused-vars': 'off',
      'no-unused-private-class-members': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'all',
          caughtErrors: 'all',
          ignoreRestSiblings: false,
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-extraneous-class': [
        'error',
        { allowWithDecorator: true },
      ],
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          assertionStyle: 'as',
          objectLiteralTypeAssertions: 'never',
        },
      ],
      '@typescript-eslint/no-non-null-asserted-nullish-coalescing': 'error',
    },
  };
};
