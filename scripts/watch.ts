import * as fs from 'fs'
import { create } from 'browser-sync'
import { SRC, STATIC, DIST, build } from './build'

const bs = create()

;[SRC, STATIC].forEach((dir) => {
  fs.watch(
    dir,
    {
      recursive: true,
    },
    () => {
      build()
      bs.reload(`${DIST}/**/*`)
    }
  )
})

build()

bs.init({
  server: './dist',
})
