export default [
  {
    ignores: ["src/**/*_test.js"],
  },
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        fetch: "readonly",
        navigator: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["error", { "varsIgnorePattern": "^_", "argsIgnorePattern": "^_" }],
      "no-undef": "error",
      "no-console": "warn",
      "eqeqeq": "error",
      "no-var": "error",
      "prefer-const": "error",
    },
  },
];
