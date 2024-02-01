import dts from 'bun-plugin-dts'

await Bun.build({
  entrypoints: [
    './src/index.ts',
    // './src/parse_by_tagname.ts', 
    // './src/parse_full_table.ts', 
  ],
  outdir: './dist',
  minify: true,
  target: 'node',
  splitting: true,
  plugins: [dts()],
  format: "esm",
  sourcemap: 'external'
})
