import pluginNext from "@next/eslint-plugin-next";
import pluginReactHooks from "eslint-plugin-react-hooks";
import { config as base } from "./base.js";
import { reactComponentStructureRule } from "./rules/react-component-structure.js";

/** @type {import("eslint").Linter.Config[]} */
export const config = [
  ...base,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@next/next": pluginNext,
      "react-hooks": pluginReactHooks,
      "react-component-structure": {
        rules: {
          "react-component-structure": reactComponentStructureRule,
        },
      },
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs["core-web-vitals"].rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-component-structure/react-component-structure": "error",
    },
  },
];

export default config;
