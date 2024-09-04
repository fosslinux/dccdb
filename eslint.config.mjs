import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import html from "@html-eslint/eslint-plugin";
import pHtml from "eslint-plugin-html";

export default [
  {files: ["**/*.{js,mjs,cjs,ts}"]},
  {languageOptions: { globals: {...globals.browser, ...globals.node} }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ...html.configs["flat/recommended"],
    files: ["**/*.html"],
  },
  {
    plugins: {
      html: pHtml,
    },
    files: ["**/*.html"],
  },
];
