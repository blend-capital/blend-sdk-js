import typescript from '@rollup/plugin-typescript';
import pkg from './package.json' assert { type: 'json' };

export default {
  input: 'src/index.ts',
  external: ['stellar-base'],
  output: [
    // ES module (for bundlers)
    { file: pkg.module, format: 'es', sourcemap: true },
    // CommonJS (for node)
    { file: pkg.main, format: 'cjs', sourcemap: true },
    // browser-friendly UMD build
    {
      name: 'blend-sdk',
      file: pkg.browser,
      format: 'umd',
      globals: {
        'stellar-base': 'stellarBase',
      },
      sourcemap: true,
    },
  ],
  plugins: [typescript()],
};
