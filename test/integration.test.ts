/* eslint-disable jest/expect-expect */
import winston from 'winston'
import winstonSeq from '../src/index'

require('dotenv').config()

let logger: winston.Logger, transport: winstonSeq

describe('@integration', () => {
  beforeAll(() => {
    if (!process.env.SEQ_URL) {
      console.log(`
      ****************
    
      Needs a seq server. See README.md
      
      ***************`)
    }

    transport = new winstonSeq({
      serverUrl: process.env.SEQ_URL,
      apiKey: process.env.SEQ_API_KEY,
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
