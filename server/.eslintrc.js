module.exports = {
    'root': true,
    'env': {
        'node': true,
        'es2021': true
    },
    'extends': [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
    ],
    'ignorePatterns': [
        '.eslintrc.js'
    ],
    'parser': '@typescript-eslint/parser',
    'parserOptions': {
        'ecmaVersion': 'latest',
        'sourceType': 'module',
        'project': true,
        'tsconfigRootDir': __dirname
    },
    'plugins': [
        '@typescript-eslint'
    ],
    'rules': {
        'quotes': [
            'error',
            'single',
            { 'avoidEscape': true }
        ],
        'eqeqeq': [
            'error',
            'always'
        ],
        '@typescript-eslint/no-unnecessary-type-assertion': 'error',
        'no-unused-vars': 'off',
        'no-unused-private-class-members': 'error',
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                'vars': 'all',
                'args': 'all',
                'caughtErrors': 'all',
                'ignoreRestSiblings': false,
                'varsIgnorePattern': '^_',
                'argsIgnorePattern': '^_',
                'caughtErrorsIgnorePattern': '^_',
                'destructuredArrayIgnorePattern': '^_'
            }
        ],
        '@typescript-eslint/no-extraneous-class': [
            'error',
            {
                'allowWithDecorator': true
            }
        ],
        '@typescript-eslint/consistent-type-assertions': [
            'error',
            {
                'assertionStyle': 'as',
                'objectLiteralTypeAssertions': 'never'
            }
        ],
        '@typescript-eslint/no-non-null-asserted-nullish-coalescing': 'error'
    }
};
