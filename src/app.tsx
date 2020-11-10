import React, { useEffect, useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import { fetchFile } from '@ffmpeg/ffmpeg'
import { ffmpeg, runFFMpeg } from './ffmpeg'
import videoSrc from './video.mp4'

function useHelp() {
  const [help, setHelp] = useState<string>('')
  async function run() {
    await runFFMpeg(['--help', 'long']).then(({ ffout, fferr }) => {
      if (fferr.length) {
        console.error(fferr.join('\n').trim())
      }
      setHelp(ffout.join('\n').trim())
    })
  }
  return {
    help,
    run,
  }
}

function useVersion() {
  const [version, setVersion] = useState<string>('')
  async function run() {
    await runFFMpeg(['-version']).then(({ ffout, fferr }) => {
      if (fferr.length) {
        console.error(fferr.join('\n').trim())
      }
      setVersion(ffout.join('\n').trim())
    })
  }
  return {
    version,
    run,
  }
}

function useLicense() {
  const [license, setLicense] = useState<string>('')
  async function run() {
    await runFFMpeg(['-L']).then(({ ffout, fferr }) => {
      if (fferr.length) {
        console.error(fferr.join('\n').trim())
      }
      setLicense(ffout.join('\n').trim())
    })
  }
  return {
    license,
    run,
  }
}

function useThumbnail({ IN, scale }: { IN: string; scale: string }) {
  const [thumbnail, setThumbnailUrl] = useState({ loaded: false, value: '' })
  async function run() {
    // Get audio stream
    const THUMBNAIL_OUT = 'out.jpg'
    await runFFMpeg(
      [
        '-i',
        IN,
        '-ss',
        '1',
        '-vframes',
        '1',
        '-filter:v',
        `scale=${scale}`,
        THUMBNAIL_OUT,
      ],
      {
        onLog(log) {
          setThumbnailUrl({ loaded: false, value: log.message })
        },
      }
    )
    const image = new Blob([ffmpeg.FS('readFile', THUMBNAIL_OUT).buffer], {
      type: 'image/jpeg',
    })
    setThumbnailUrl({ loaded: true, value: URL.createObjectURL(image) })
  }
  return {
    thumbnail,
    run,
  }
}

function useAudioConverter({ IN }: { IN: string }) {
  const [audio, setAudioUrl] = useState({ loaded: false, value: '' })
  async function run() {
    // Get audio stream
    const AUDIO_OUT = 'out.mp3'
    await runFFMpeg(['-v', 'warning', '-i', IN, AUDIO_OUT], {
      onLog(log) {
        setAudioUrl({ loaded: false, value: log.message })
      },
    })
    const audio = new Blob([ffmpeg.FS('readFile', AUDIO_OUT).buffer], {
      type: 'audio/mpeg',
    })
    setAudioUrl({ loaded: true, value: URL.createObjectURL(audio) })
  }
  return {
    audio,
    run,
  }
}

function useGifConverter({ IN, scale }: { IN: string; scale: string }) {
  const [gif, setGifUrl] = useState({ loaded: false, value: '' })
  async function run() {
    // Create color palette for GIF
    // https://life.craftz.dog/entry/generating-a-beautiful-gif-from-a-video-with-ffmpeg
    const TMP_PALETTE = 'palette.png'
    const GIF_OUT = 'out.gif'
    await runFFMpeg(
      ['-v', 'warning', '-i', IN, '-vf', 'palettegen', '-y', TMP_PALETTE],
      {
        onLog(log) {
          setGifUrl({ loaded: false, value: log.message })
        },
      }
    )
    // Get gif
    await runFFMpeg(
      [
        '-v',
        'warning',
        '-i',
        IN,
        '-i',
        TMP_PALETTE,
        '-lavfi',
        `fps=12,scale=${scale}:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
        '-y',
        GIF_OUT,
      ],
      {
        onLog(log) {
          setGifUrl({ loaded: false, value: log.message })
        },
      }
    )
    const gif = new Blob([ffmpeg.FS('readFile', GIF_OUT).buffer], {
      type: 'image/gif',
    })
    setGifUrl({ loaded: true, value: URL.createObjectURL(gif) })
  }
  return {
    gif,
    run,
  }
}

function useResizer({ IN, scale }: { IN: string; scale: string }) {
  const [resized, setResizedUrl] = useState({ loaded: false, value: '' })
  async function run() {
    // Get resized video
    const RESIZE_OUT = 'out.mp4'
    await runFFMpeg(
      ['-v', 'warning', '-i', IN, '-vf', `scale=${scale}`, RESIZE_OUT],
      {
        onLog(log) {
          // NOTE: Detect FFMPEG_END Manually. Promise won't be resolved for some reason...
          if (log.message.includes('FFMPEG_END')) {
            const resized = new Blob(
              [ffmpeg.FS('readFile', RESIZE_OUT).buffer],
              {
                type: 'video/mp4',
              }
            )
            setResizedUrl({ loaded: true, value: URL.createObjectURL(resized) })
          } else {
            setResizedUrl({ loaded: false, value: log.message })
          }
        },
      }
    )
    const resized = new Blob([ffmpeg.FS('readFile', RESIZE_OUT).buffer], {
      type: 'video/mp4',
    })
    setResizedUrl({ loaded: true, value: URL.createObjectURL(resized) })
  }
  return {
    resized,
    run,
  }
}

const IN = 'in.mp4'

function App() {
  const originalRef = useRef<HTMLVideoElement>(null)
  const [originalDimension, setOriginalDimension] = useState<[number, number]>([
    -1,
    -1,
  ])
  const { help, run: runHelp } = useHelp()
  const { version, run: runVersion } = useVersion()
  const { license, run: runLicense } = useLicense()
  const { thumbnail, run: runThumbnail } = useThumbnail({ IN, scale: '320:-2' })
  const { audio, run: runAudioConverter } = useAudioConverter({ IN })
  const { gif, run: runGifConverter } = useGifConverter({ IN, scale: '320:-2' })
  const { resized, run: runResizer } = useResizer({ IN, scale: '320:-2' })

  useEffect(() => {
    ;(async () => {
      const queue = [
        () => ffmpeg.load(),
        async () => ffmpeg.FS('writeFile', IN, await fetchFile(videoSrc)),
        runHelp,
        runVersion,
        runLicense,
        runThumbnail,
        runAudioConverter,
        runGifConverter,
        runResizer,
      ]

      for (let fn of queue) {
        await fn()
      }
    })()

    const originalVideoEl = originalRef.current!
    originalVideoEl.addEventListener('loadeddata', () => {
      setOriginalDimension([
        originalVideoEl.videoWidth,
        originalVideoEl.videoHeight,
      ])
    })
  }, [])

  return (
    <>
      <h1>ffmpeg.wasm demo</h1>
      <dl>
        <dt>
          Version: <code>ffmpeg --version</code>
        </dt>
        <dd>
          <pre>{version || 'Loading...'}</pre>
        </dd>
        <dt>
          License: <code>ffmpeg -L</code>
        </dt>
        <dd>
          <pre>{license || 'Loading...'}</pre>
        </dd>
        <dt>
          Help: <code>ffmpeg --help long</code>
        </dt>
        <dd>
          <details>
            <summary>{help ? 'Show help' : 'Loading...'}</summary>
            <pre>{help}</pre>
          </details>
        </dd>
      </dl>
      <div style={{ display: 'flex' }}>
        <div style={{ flex: 1, padding: 16 }}>
          <h2>
            Original: {originalDimension[0]}x{originalDimension[1]}
          </h2>
          <video
            src={videoSrc}
            muted
            controls
            ref={originalRef}
            style={{ maxWidth: '100%' }}
          ></video>
          <small>Video by Ambient_Nature_ Atmosphere from Pexels</small>
        </div>
        <div style={{ flex: 1, padding: 16 }}>
          <h2>Output:</h2>
          <dl>
            <dt>Thumbnail:</dt>
            <dd>
              {thumbnail.loaded ? (
                <img src={thumbnail.value} style={{ maxWidth: '100%' }} />
              ) : (
                'Loading... ' + thumbnail.value
              )}
            </dd>

            <dt>Audio:</dt>
            <dd>
              {audio.loaded ? (
                <audio src={audio.value} controls></audio>
              ) : (
                'Loading... ' + audio.value
              )}
            </dd>

            <dt>Gif:</dt>
            <dd>
              {gif.loaded ? (
                <img src={gif.value} style={{ maxWidth: '100%' }} />
              ) : (
                'Loading... ' + gif.value
              )}
            </dd>

            <dt>Resized video:</dt>
            <dd>
              {resized.loaded ? (
                <video
                  src={resized.value}
                  muted
                  controls
                  style={{ maxWidth: '100%' }}
                ></video>
              ) : (
                'Loading... ' + resized.value
              )}
            </dd>
          </dl>
        </div>
      </div>
    </>
  )
}

const rootElement = document.getElementById('root')
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  rootElement
)
