import { config } from "@repo/eslint-config/react-internal";

export default [
  ...config,
  {
    files: ["src/components/**/*.tsx"],
    rules: {
      "react-component-structure/react-component-structure": "off",
    },
  },
];
