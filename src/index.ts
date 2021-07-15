import * as seq from 'seq-logging'
import TransportStream from 'winston-transport'

enum WinstonLevels {
  error = 'error',
  warn = 'warn',
  info = 'info',
  http = 'http',
  verbose = 'verbose',
  debug = 'debug',
  silly = 'silly',
}

//
// Inherit from `winston-transport` so you can take advantage
// of the base functionality and `.exceptions.handle()`.
//
class SeqTransport extends TransportStream {
  public logger: seq.Logger

  constructor (
    config: seq.SeqLoggerConfig,
    opts: TransportStream.TransportStreamOptions = {}
  ) {
    super(Object.assign(opts))

    this.logger = new seq.Logger(config)
    setImmediate(() => this.emit('opened'))
  }

  /**
 * Writes to the stream associated with this instance.
 * @param {Info} info - Winston log information.
 * @param {Function} next - Continuation to respond to when complete.
 * @returns {void}
 */
  log (info: unknown, next: () => void): void {
    const { level, message, ...rest } =
    <{ level:string, message: string }>info

    const timestamp = new Date()
    setImmediate(() => {
      this.logger.emit({
        timestamp,
        level: this.mapLevel(level),
        messageTemplate: message,
        properties: rest,
        /*
          exception:
            Unsure if this can be used 🤷‍♂️
            super has a handleExceptions option 💡
        */
      })

      setImmediate(() => this.emit('logged', info))
    })

    next()
  }

  close (): void {
    setImmediate(() => {
      this.logger.flush().then(() => {
        setImmediate(() => this.emit('flushed', this.logger))
        this.logger.close().then(() => {
          setImmediate(() => this.emit('closed', this.logger))
        })
      })
    })
  }

  private mapLevel (level: string){
    switch (level) {
      // Note: There is no equivalent for the Seq 'Fatal'
      case WinstonLevels.error: return 'Error'
      case WinstonLevels.warn: return 'Warning'
      case WinstonLevels.http:
      case WinstonLevels.info: return 'Information'
      case WinstonLevels.debug: return 'Debug'
      case WinstonLevels.silly:
      case WinstonLevels.verbose: return 'Verbose'
      default:
        throw new Error(`Unknown logging level ${level}`)
    }
  }
}

export default SeqTransport
