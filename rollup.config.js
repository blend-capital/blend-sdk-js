import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';
import pkg from './package.json' assert { type: 'json' };

export default [
  {
    input: 'src/index.ts',
    external: ['stellar-base'],
    output: [
      // ES module (for bundlers)
      { file: pkg.main, format: 'es', sourcemap: true },
    ],
    plugins: [typescript(), nodeResolve(), commonjs(), nodePolyfills()],
  },
  {
    input: 'lib/index.d.ts',
    output: [{ file: 'dist/blend-sdk.d.ts', format: 'es' }],
    plugins: [dts()],
  },
];
