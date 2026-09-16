import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default [
  ...nextVitals,
  ...nextTs,
  { ignores: [".next/**", "node_modules/**", "drizzle/**", "public/**", "sources/**"] },
  { rules: { "@typescript-eslint/no-explicit-any": "warn", "react-hooks/set-state-in-effect": "off", "react-hooks/exhaustive-deps": "off", "react-hooks/refs": "off" } },
];
