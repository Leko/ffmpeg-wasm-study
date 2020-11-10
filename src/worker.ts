import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg'

const ffmpeg = createFFmpeg({ log: true })

addEventListener('message', (e) => {
  postMessage(e.data)
  runFFMpeg(['-h'])
    .then((res) => console.log('[worker][ffmpeg]', res))
    .catch((e) => console.error('[worker][ffmpeg]', e))
})

async function runFFMpeg(args: string[]) {
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load()
  }
  console.log(ffmpeg.isLoaded())
  // ffmpeg.FS('writeFile', 'test.avi', await fetchFile('./test.avi'));
  // await ffmpeg.run('-i', 'test.avi', 'test.mp4');
  // await fs.promises.writeFile('./test.mp4', ffmpeg.FS('readFile', 'test.mp4'));
  // process.exit(0);
  // createFFmpeg
  // fetchFile
}
