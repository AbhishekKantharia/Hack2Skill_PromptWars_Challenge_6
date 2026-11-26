import { globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'data/**',
    'next-env.d.ts',
    'out/**',
  ]),
  ...nextVitals,
  ...nextTs,
];

export default config;
