import * as seq from 'seq-logging'
import TransportStream from 'winston-transport'

/**
 * Inherit from `winston-transport` so you can take advantage
 * of the base functionality and `.exceptions.handle()`.
 */
export class SeqTransport extends TransportStream {
  public logger: seq.Logger

  constructor (opts: seq.SeqLoggerConfig
  & TransportStream.TransportStreamOptions) {
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
    const { level, message, exception, stack, ...props } = info;

    this.logger.emit({
      timestamp: props.timestamp || new Date(),
      level: level,
      messageTemplate: message,
      properties: props,
      // sometimes exception is a boolean, sometimes it is undefined
      exception: exception || stack
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

if (!String.prototype.startsWith) {
  Object.defineProperty(String.prototype, 'startsWith', {
    value: function (search: string, rawPos: number) {
      const pos = rawPos > 0 ? rawPos|0 : 0
      return this.substring(pos, pos + search.length) === search
    },
  })
}
