import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
export default defineConfig([
  ...nextVitals,
  {
    rules: {
      "@next/next/no-img-element": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([
    "legacy/**",
    "public/**",
    "scripts/**",
    "tests/**",
    ".tools/**",
    "tmp/**",
    ".next/**",
    "next-env.d.ts",
  ]),
]);
