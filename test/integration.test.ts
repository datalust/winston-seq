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
      throw new Error('Seq required')
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
    const random = Math.round(Math.random() * 1000);
    const childLogger = logger.child({ requestId: random });
    childLogger.info('Test: should send a log to {target} with random {n}', { n: random+1, target: "Seq" });
    const taskLogger = logger.child({ activity: "purchase" });
    taskLogger.debug(
      "User {user} purchase product {product} at ${price}", 
      {
        user: "Millie Gilbert",
        product: "Yardtime Garden Shears",
        price: 29.99
      });
      await transport.flush();
      // query the seq api for my log
  })

})
