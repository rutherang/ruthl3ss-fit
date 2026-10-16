const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier/flat');
const reactNative = require('eslint-plugin-react-native');

module.exports = defineConfig([
  // Fixed: Standardized relative directory paths for all operating systems (Windows/WSL)
  globalIgnores([
    'node_modules/',
    '.expo/',
    'dist/',
    'web-build/',
    'ios/',
    'android/',
  ]),

  expoConfig,
  {
    plugins: {
      'react-native': reactNative,
    },
    rules: {
      'react-native/no-raw-text': [
        'error',
        {
          // Fixed: Simplified NativeTabs to allow dot-notation objects safely
          skip: ['Text', 'ThemedText', 'TabButton', 'NativeTabs'],
        },
      ],
      'react-native/no-unused-styles': 'error',
      'react-native/no-inline-styles': 'warn',
      'react-native/split-platform-components': 'warn',
      'react-native/no-color-literals': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  eslintConfigPrettier,
]);
