import dts from 'bun-plugin-dts'
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  minify: true,
  target: 'node',
  splitting: true,
  plugins: [dts()],
  format: "esm",
  sourcemap: 'external'
})
