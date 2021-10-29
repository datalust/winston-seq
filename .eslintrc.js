// eslint-disable-next-line no-undef
module.exports = {
  root: true,
  plugins: ['jest'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jest/recommended',
  ],
  env: { 'jest/globals': true },
  ignorePatterns: ['node_modules', 'dist', 'coverage'],
  rules: {
    // TS
    '@typescript-eslint/ban-ts-comment': 'off',
    // ES:off + TS:on
    'semi': 'off',
    '@typescript-eslint/semi': ['error', 'never'],
    'indent': 'off',
    '@typescript-eslint/indent': ['error', 2],
    'quotes': 'off',
    '@typescript-eslint/quotes': [
      'error', 'single', { 'allowTemplateLiterals': true },
    ],
    'comma-dangle': 'off',
    '@typescript-eslint/comma-dangle': ['error', 'always-multiline'],
    // ES
    'arrow-spacing': ['error', { 'before': true, 'after': true }],
    'space-before-function-paren': ['error', 'always'],
    'no-trailing-spaces': 'error',
    'max-len': ['error', { 'code': 110 }],
    'eol-last': ['error', 'always'],
    'no-tabs': ['error', { 'allowIndentationTabs': false }],
    'comma-spacing': ['error', { 'before': false, 'after': true }],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'no-multi-spaces': 'error',
    'space-in-parens': ['error', 'never'],
    'key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }],
    'func-call-spacing': ['error', 'never'],
  },
}
