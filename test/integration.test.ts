/* eslint-disable jest/expect-expect */
import winston from 'winston'
import winstonSeq from '../src/index'

let logger: winston.Logger, transport: winstonSeq

describe('@integration', () => {
  beforeAll(() => {
    console.log(`
    ****************
    
    Needs a seq server
    
    ***************`)


    transport = new winstonSeq({
      serverUrl: 'http://159.223.82.185:5341',
      apiKey: '0OqC95GZKPCvE89XDjBI',
      onError: (e => { console.error(e) }),
      handleExceptions: true,
      handleRejections: true,
    })
    logger = winston.createLogger({
      level: 'debug',
      defaultMeta: { application: 'logtests' },
      transports: [
        transport,
      ],
    })
  })

  afterAll(async () => {
    return new Promise(resolve => {
      logger.close()
      resolve(null)
    })
  })


  it('should send a log to seq', async () => {
    const childLogger = logger.child({ requestId: '451' })
    childLogger.info('Logging from child for the {n}th time, {user}!', { n: 7, user: 'Bob' })
  })

})
