const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier/flat');
const reactNative = require('eslint-plugin-react-native');

module.exports = defineConfig([
  globalIgnores(['/node_modules', '/.expo', '/dist', '/web-build']),
  expoConfig,
  {
    plugins: {
      'react-native': reactNative,
    },
    rules: {
      ...reactNative.configs.all.rules,
      'react-native/no-raw-text': ['error', { skip: ['Text'] }],
      'react-native/no-inline-styles': 'warn',
      'react-native/no-color-literals': 'off',
      'react-native/no-unused-styles': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  eslintConfigPrettier,
]);
