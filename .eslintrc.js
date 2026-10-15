module.exports = {
  root: true,
  extends: [
    'expo',
    'plugin:react-native/all',
    'prettier', // Disables ESLint rules that conflict with Prettier
  ],
  plugins: ['react-native'],
  ignorePatterns: ['/node_modules', '/.expo', '/dist', '/web-build'],
  rules: {
    // Prevent raw text outside <Text> components (prevents iOS/Android runtime crashes)
    'react-native/no-raw-text': ['error', { skip: ['Text'] }],

    // Style & Quality
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'off', // Turn off if using themes/Tailwind/NativeWind
    'react-native/no-unused-styles': 'error',

    // Hooks & Core React
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // TypeScript / Imports
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
