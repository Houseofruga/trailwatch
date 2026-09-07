import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

// eslint-config-next 16 ships native flat configs — no FlatCompat needed.
const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "trailwatch/**", "trailwatch v2/**", "trailwatch v3/**", "dashboard multi-change/**"] },
  ...nextCoreWebVitals,
  ...nextTypeScript,
];

export default eslintConfig;
