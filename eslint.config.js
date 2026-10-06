
import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/**", "api/node_modules/**", "_site/**", ".cache/**"] },
  js.configs.recommended,

  {
    files: ["api/**/*.js"],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
  },

  {
    files: ["libro-de-visitas.js"],
    languageOptions: { sourceType: "script", globals: globals.browser },
  },

  {
    files: ["tests/**/*.js", "scripts/**/*.mjs", "eslint.config.js"],
    languageOptions: { sourceType: "module", globals: globals.node },
  },

  {
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];
