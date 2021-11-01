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

  afterAll(() => {
    logger.close()
  })


  it('should send a log to seq with defaultMeta properties', async () => {
    const random = getRandom();
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
    const random = getRandom();
    const childLogger = logger.child({ requestId: 451 })
    childLogger.info('Logging from child', { random });
    await transport.flush();
    const event = await queryEvent(`random = '${random}'`);
    expect(getPropertyFromEvent(event, 'requestId')).toBe(451);
    expect(getMessageFromEvent(event)).toBe('Logging from child');
  })

  it('should send 10 events', async () => {
    const random = getRandom();
    for (let n = 1; n <= 10; n++) {
      logger.info('Logging event number {n}', { n, random });
    }
    await transport.flush();
    const events = await queryEvents(`random = '${random}'`);
    expect(events.length).toBe(10);
  })

  it('should allow explicit timestamp', async () => {
    const random = getRandom();
    const tenMinutesAgo = new Date(new Date().getTime() - 600 * 1000);
    logger.info("Logging at {now} with past timestamp {timestamp}", {
      now: new Date(),
      timestamp: tenMinutesAgo,
      random
    });
    await transport.flush();
    const event = await queryEvent(`random = '${random}'`);
    expect(event).toBeDefined();
    expect(getPropertyFromEvent(event, 'timestamp')).toBe(tenMinutesAgo.toISOString());

  });

  it('should work with different formats', async ()=>{
    const random = getRandom();
    const diffFormatTransport = new winstonSeq({
      serverUrl: process.env.SEQ_INGESTION_URL,
      apiKey: process.env.SEQ_API_KEY,
      onError: (e => { console.error(e) }),
      handleExceptions: true,
      handleRejections: true,
    });
    const diffFormatLogger = winston.createLogger({
      level: 'debug',
      format: winston.format.combine(
        winston.format.label({ label: 'right meow!' }),
        winston.format.timestamp(),
        winston.format.prettyPrint()
      ),
      defaultMeta: { application: 'differentFormatTests' },
      transports: [
        diffFormatTransport,
      ],
    });

    diffFormatLogger.info("winston-seq: tests: should work with different {whats}", {whats: "formats", random});
    diffFormatLogger.close();
    await diffFormatTransport.flush();

    const event = await queryEvent(`random = '${random}'`);
    expect(event).toBeDefined();
    expect(getPropertyFromEvent(event, 'whats')).toBe('formats');
  })

})

function getPropertyFromEvent(event: any, propertyName: string) {
  return event.Properties.find((p: any) => p.Name === propertyName).Value;
}

function getMessageFromEvent(event: any) {
  return event.MessageTemplateTokens[0].Text;
}

function getRandom() {
  return Math.round(Math.random() * 1000000).toString();
}

async function queryEvent(filter: string) {
  const response = await axios.get(`${process.env.SEQ_API_URL}/api/events/signal?filter=${encodeURIComponent(filter)}&count=1&shortCircuitAfter=100&apiKey=${process.env.SEQ_API_KEY}`);
  if (response.data.Events.length === 0) {
    throw new Error('No events match filter ' + filter);
  }
  return response.data.Events[0];
}

async function queryEvents(filter: string) {
  const response = await axios.get(`${process.env.SEQ_API_URL}/api/events/signal?filter=${encodeURIComponent(filter)}&count=150&shortCircuitAfter=100&apiKey=${process.env.SEQ_API_KEY}`);
  return response.data.Events;
}