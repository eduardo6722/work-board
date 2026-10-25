import globals from "globals";
import { config as base } from "./base.js";

/** @type {import("eslint").Linter.Config[]} */
export const config = [
  ...base,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-extraneous-class": "off",
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
];

export default config;
