import * as path from 'path'
import * as esbuild from 'esbuild'
import * as fsExtra from 'fs-extra'

export const SRC = path.join(__dirname, '..', 'src')
export const STATIC = path.join(__dirname, '..', 'static')
export const DIST = path.join(__dirname, '..', 'dist')

export function build() {
  esbuild.buildSync({
    entryPoints: [path.join(SRC, 'app.tsx'), path.join(SRC, 'worker.ts')],
    outdir: DIST,
    logLevel: 'info',
    bundle: true,
    minify: true,
    sourcemap: true,
    target: '',
    define: {
      'process.env.NODE_ENV': `"${process.env.NODE_ENV}"`,
    },
    loader: {
      '.mp4': 'file',
    },
  })
  fsExtra.copySync(STATIC, DIST)
}

if (require.main === module) {
  build()
}
