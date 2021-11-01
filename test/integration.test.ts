/* eslint-disable jest/expect-expect */
import winston from 'winston'
import winstonSeq from '../src/index'
const axios = require('axios').default;
require('dotenv').config()

let logger: winston.Logger, transport: winstonSeq

describe('@integration', () => {
  beforeAll(() => {
    if (!process.env.SEQ_INGESTION_URL) {
      console.log(`
      ****************
      
      Needs a seq server. See README.md Contributing. 
      
      ***************`);
      throw new Error('Seq required')
    }

    transport = new winstonSeq({
      serverUrl: process.env.SEQ_INGESTION_URL,
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
    const random = Math.round(Math.random() * 1000).toString();
    logger.debug(
      "User {user} purchase product {product} at ${price}", 
      {
        user: "Millie Gilbert",
        product: "Yardtime Garden Shears",
        price: 29.99,
        random
      });
    await transport.flush();
    const event = await queryEvent(`random = '${random}'`);
    expect(getPropertyFromEvent(event, 'user')).toBe("Millie Gilbert");
    expect(getPropertyFromEvent(event, 'application')).toBe("logtests");
  })

  it('should send with child logger context', async () => {
    const childLogger = logger.child({ requestId: '451' })
    childLogger.info('Logging from child for the {n}th time, {user}!', { n: 7, user: 'Bob' })
  })

})

function getPropertyFromEvent(event: any, propertyName: string) {
  return event.Properties.find((p: any) => p.Name === propertyName).Value;
}

async function queryEvent(filter: string) {
  const response = await axios.get(`${process.env.SEQ_API_URL}/api/events/signal?filter=${encodeURIComponent(filter)}&count=1&shortCircuitAfter=100&apiKey=${process.env.SEQ_API_KEY}`);
  if (response.data.Events.length === 0) {
    throw new Error('No events match filter ' + filter);
  }
  return response.data.Events[0];
}