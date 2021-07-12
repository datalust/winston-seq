import seq from 'seq-logging'
import TransportStream from 'winston-transport'

//
// Inherit from `winston-transport` so you can take advantage
// of the base functionality and `.exceptions.handle()`.
//
module.exports = class SeqTransport extends TransportStream {
  private logger: seq.Logger
  constructor(
    config: seq.SeqLoggerConfig, 
    opts?: TransportStream.TransportStreamOptions
  ) {
    // options.handleExceptions 
    // - If true, info with { exception: true } will be written.
    super(opts)
    this.logger = new seq.Logger(config)    

    setImmediate(() => this.emit('opened:seq'))
  }

  /**
 * Writes to the stream associated with this instance.
 * @param {Info} info - Winston log information.
 * @param {Function} next - Continuation to respond to when complete.
 * @returns {void}
 */  
  log(info: unknown, next: () => void): void {
    setImmediate(() => {
      // TODO: Perform the writing to seq instance
      // Not sure whether to override the stream writer (TransportStream) 
      //  or use the emit below.....

      // this.logger.emit({
      //   timestamp: new Date(),
      //   level: 'Information',
      //   messageTemplate: 'Hello for the {n}th time, {user}!',
      //   // exception: ,
      //   properties: {
      //     user: process.env.USERNAME,
      //     nn: 20,
      //   },
      // })
    })

    this.emit('logged:seq', info)
    next()
  }

  close(): void {
    this.logger.close()
    setImmediate(() => this.emit('closed:seq'))
  }  
}
