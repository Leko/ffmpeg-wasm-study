import { createFFmpeg } from '@ffmpeg/ffmpeg'

export type FFMpeg = ReturnType<typeof createFFmpeg>
export type FFMpegLog = { type: string; message: string }

export const ffmpeg = createFFmpeg({ log: false })

function createFFMpegLogger(onLog: (log: FFMpegLog) => void) {
  let shouldSkip = false
  const logs: FFMpegLog[] = []
  const dust: FFMpegLog[] = []
  const log = (log: FFMpegLog) => {
    if (log.message === 'Splitting the commandline.') {
      shouldSkip = true
    }
    if (
      dust[dust.length - 1]?.message.startsWith('Applying option ') &&
      !log.message.startsWith('Applying option ')
    ) {
      shouldSkip = false
    }
    if (shouldSkip || log.message === 'FFMPEG_END') {
      dust.push(log)
      return
    }
    onLog(log)
    logs.push(log)
  }

  return {
    log,
    getErr() {
      return logs.filter((log) => log.type === 'fferr')
    },
    getOut() {
      return logs.filter((log) => log.type === 'ffout')
    },
  }
}

export async function runFFMpeg(
  args: string[],
  { onLog = () => {} }: { onLog?: (log: FFMpegLog) => void } = {}
) {
  const logger = createFFMpegLogger(onLog)
  ffmpeg.setLogger(logger.log)
  await ffmpeg.run(...args)
  ffmpeg.setLogger(() => {})
  return {
    ffout: logger.getOut().map((log) => log.message),
    fferr: logger.getErr().map((log) => log.message),
  }
}
