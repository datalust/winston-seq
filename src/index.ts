import * as seq from 'seq-logging'
import TransportStream from 'winston-transport'

/**
 * Inherit from `winston-transport` so you can take advantage
 * of the base functionality and `.exceptions.handle()`.
 */
class SeqTransport extends TransportStream {
  public logger: seq.Logger

  constructor (opts: seq.SeqLoggerConfig
  & TransportStream.TransportStreamOptions

  // this is necessary because the change to the winston-transport types
  // (https://github.com/winstonjs/winston-transport/commit/868d6577956f82ee0b021b119a4de938c61645f7)
  // has not been published yet (Oct 2021)
  & {handleRejections?: boolean}) {
    super(opts)
    this.logger = new seq.Logger(opts)
    setImmediate(() => this.emit('opened'))
  }

  /**
 * Writes to the stream associated with this instance.
 * @param {Info} info - Winston log information.
 * @param {Function} next - Continuation to respond to when complete.
 * @returns {void}
 */
  log (info: any, next: () => void): void {
    setImmediate(() => this.emit('logged', info))

    // trim info to avoid passing two copies of built-in properties
    info.exception = info.exception ? info.stack : undefined
    const message = info.message || ''
    delete info.message // this will be in the @MessageTemplate anyway

    // differentiate events that come from handleExceptions: true or handleRejections: true
    if (!!message && typeof message === 'string') {
      info.winstonLogTrigger = message.startsWith('uncaughtException')
        ? 'uncaughtException'
        : message.startsWith('unhandledRejection')
          ? 'unhandledRejection'
          : undefined
    }

    this.logger.emit({
      timestamp: info.timestamp || new Date(),
      level: info.level,
      messageTemplate: message,
      properties: info,
    });

    next()
  }

  // Only called when a transport is removed from the logger.
  close (): void {
    this.logger.close()
    setImmediate(() => this.emit('closed'))
  }

  flush(): Promise<boolean> {
    return this.logger.flush();
  }
}

export default SeqTransport

if (!String.prototype.startsWith) {
  Object.defineProperty(String.prototype, 'startsWith', {
    value: function (search: string, rawPos: number) {
      const pos = rawPos > 0 ? rawPos|0 : 0
      return this.substring(pos, pos + search.length) === search
    },
  })
}
