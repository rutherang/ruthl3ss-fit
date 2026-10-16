const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier/flat');
const reactNative = require('eslint-plugin-react-native');

module.exports = defineConfig([
  // Fixed: Standardized relative directory paths for all operating systems (Windows/WSL)
  globalIgnores(['node_modules/', '.expo/', 'dist/', 'web-build/', 'ios/', 'android/']),

  expoConfig,
  {
    plugins: {
      'react-native': reactNative,
    },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          basePath: __dirname,
          zones: [
            {
              target: './src/integrations',
              from: './src/features',
              message: 'Integrations must not depend on feature modules.',
            },
            {
              target: './src/features/*/domain/**/*',
              from: './src/integrations',
              message: 'Domain logic must not depend on integrations.',
            },
            {
              target: ['./src/features', './src/integrations'],
              from: './src/app',
              message: 'App routes must not be imported by features or integrations.',
            },
            {
              target: './src/features/workout',
              from: './src/features/scale',
              message: 'Workout and scale features must not depend on each other.',
            },
            {
              target: './src/features/scale',
              from: './src/features/workout',
              message: 'Workout and scale features must not depend on each other.',
            },
          ],
        },
      ],
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
