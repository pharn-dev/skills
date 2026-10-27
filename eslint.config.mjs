import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.cache/**",
      "**/dist/**",
      "**/evals/results/**",
      // src/phargus has its own package.json, ESLint config and CI job, and generates plugins/phargus.
      "src/phargus/**",
      "plugins/phargus/**",
      // Installed and updated by the PHARN CLI (pharn.records.json); not edited by hand.
      "pharn/**",
      ".claude/**",
    ],
  },
  js.configs.recommended,
  { files: ["**/*.{js,mjs}"], languageOptions: { globals: globals.node } },
  { files: ["**/*.cjs"], languageOptions: { sourceType: "commonjs", globals: globals.node } },
  prettier,
];
