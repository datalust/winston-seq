/* eslint-disable jest/expect-expect */
import winston from 'winston'
import { SeqTransport } from '../src/index'
const axios = require('axios').default;
require('dotenv').config()

let logger: winston.Logger, transport: SeqTransport

describe('winston-seq', () => {
  beforeAll(() => {
    if (!process.env.SEQ_INGESTION_URL) {
      console.log(`
      ****************
      
      SEQ_INGESTION_URL and SEQ_API_URL are required.

      See Contributing in README.md for instructions. 
      
      ***************`);
      throw new Error('Seq URLs required.')
    }

    transport = new SeqTransport({
      serverUrl: process.env.SEQ_INGESTION_URL,
      apiKey: process.env.SEQ_API_KEY,
      onError: (e => { console.error(e) }),
      handleExceptions: true,
      handleRejections: true,
    })
    logger = winston.createLogger({
      level: 'silly',
      format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: { application: 'logtests' },
      transports: [
        transport,
      ],
    })
  })

  afterAll(() => {
    if (logger) logger.close()
  })

  it('should send a log to seq with defaultMeta properties', async () => {
    const random = getRandom();
    logger.debug(
      "User {user} purchase product {product} at ${price}",
      {
        user: "Millie Gilbert",
        product: "Yardtime Garden Shears",
        price: 29.99,
        random,
      });
    await transport.flush();
    const event = await queryEvent(`random = '${random}'`);
    expect(getPropertyFromEvent(event, 'user')).toBe("Millie Gilbert");
    expect(getPropertyFromEvent(event, 'application')).toBe("logtests");
    expect(getPropertyFromEvent(event, 'product')).toBe("Yardtime Garden Shears");
    expect(getPropertyFromEvent(event, 'price')).toBe(29.99);
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

  it('should send events via many loggers', async () => {
    // This test exists to investigate issue https://github.com/datalust/winston-seq/issues/8
    // A warning is written if many loggers share a transport.
    // This behaviour comes from winston. See https://github.com/winstonjs/winston/issues/1334
    const random = getRandom();

    const bulkLoggers = [...Array(5).keys()].map(() => {
      const t = new SeqTransport({
        serverUrl: process.env.SEQ_INGESTION_URL,
        apiKey: process.env.SEQ_API_KEY,
        onError: (e => { console.error(e) }),
        handleExceptions: true,
        handleRejections: true,
      });
      const l = winston.createLogger({
        level: 'silly',
        format: winston.format.combine(
          winston.format.errors({ stack: true }),
          winston.format.json(),
        ),
        defaultMeta: { application: 'logtests' },
        transports: [
          t,
        ],
      });
      return { t, l };
    });

    bulkLoggers.forEach(({ l }) => {
      for (let n = 1; n <= 100; n++) {
        l.info('Logging event number {n}', { n, random });
      }
    });
    await Promise.all(bulkLoggers.map(({ t, l }) => {
      l.close();
      return t.flush();
    }));
  });

  it('should allow explicit timestamp', async () => {
    const random = getRandom();
    const threeMinutesAgo = new Date(new Date().getTime() - 180 * 1000);
    logger.info("Logging at {now} with past timestamp {timestamp}", {
      now: new Date(),
      timestamp: threeMinutesAgo,
      random,
    });
    await transport.flush();
    const event = await queryEvent(`random = '${random}'`);
    expect(event).toBeDefined();
    expect(getPropertyFromEvent(event, 'timestamp')).toBe(threeMinutesAgo.toISOString());
  });

  it('should work with different formats', async () => {
    const random = getRandom();
    const diffFormatTransport = new SeqTransport({
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

    diffFormatLogger.info(
      "winston-seq: tests: should work with different {whats}",
      { whats: "formats", random });
    diffFormatLogger.close();
    await diffFormatTransport.flush();

    const event = await queryEvent(`random = '${random}'`);
    expect(event).toBeDefined();
    expect(getPropertyFromEvent(event, 'whats')).toBe('formats');
  })

  it('should work with no API key', async () => {
    const random = getRandom();
    const anonTransport = new SeqTransport({
      serverUrl: process.env.SEQ_INGESTION_URL,
      onError: (e => { console.error(e) }),
      handleExceptions: true,
      handleRejections: true,
    });
    const anonLogger = winston.createLogger({
      level: 'debug',
      defaultMeta: { application: 'noAPItests' },
      transports: [
        anonTransport,
      ],
    });

    anonLogger.info("winston-seq: tests: should work with no API key", { random });
    anonLogger.close();
    await anonTransport.flush();

    const event = await queryEvent(`random = '${random}'`);
    expect(event).toBeDefined();
  })

  it('should log exceptions', async () => {
    const random = getRandom();
    try{
      throw new Error("Test error");
    } catch (e) {
      // Type coercion here because Winston's typings are stricter than its runtime API.
      logger.error(e as string, { random });
    }
    await transport.flush();
    const event = await queryEvent(`random = '${random}'`);
    expect(event).toBeDefined();
    expect(event.Exception).toMatch(/Error: Test error(.|\W)+/);
  });

  it('should log all logging levels', async () => {
    const random = getRandom();
    const levels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
    levels.map(level => {
      logger.log(
        level,
        "winston-seq: testing: logging levels",
        { level, random, test: 'should log all logging levels' });
    });
    await transport.flush();
    const events = await queryEvents(`random = '${random}'`);
    expect(events).toBeDefined();
    expect(events.some((event: any) => event.Level == 'error')).toBe(true);
    expect(events.some((event: any) => event.Level == 'silly')).toBe(true);
    expect(events.some((event: any) => event.Level == 'http')).toBe(true);
    expect(events.some((event: any) => event.Level == 'warn')).toBe(true);
    expect(events.some((event: any) => event.Level == 'info')).toBe(true);
    expect(events.some((event: any) => event.Level == 'verbose')).toBe(true);
    expect(events.some((event: any) => event.Level == 'debug')).toBe(true);
  });

  it('should support level changes', async () => {
    const first = getRandom(), second = getRandom();

    const modifiableTransport = new SeqTransport({
      level: 'info',
      serverUrl: process.env.SEQ_INGESTION_URL,
      apiKey: process.env.SEQ_API_KEY,
      onError: (e => { console.error(e) }),
      handleExceptions: true,
      handleRejections: true,
    })

    const modifiableLogger = winston.createLogger({
      level: 'silly',
      defaultMeta: { application: 'logtests' },
      transports: [
        modifiableTransport,
      ],
    })

    modifiableLogger.debug('A quiet little debug message', {random: first});
    await modifiableTransport.flush();

    modifiableTransport.level = 'debug';

    modifiableLogger.debug('A quiet little debug message', {random: second});
    await modifiableTransport.flush();

    const firstEventP = queryEvent(`random = '${first}'`);
    const secondEventP = queryEvent(`random = '${second}'`);

    const firstEvent = await firstEventP;
    expect(firstEvent).toBeUndefined();

    const secondEvent = await secondEventP;
    expect(secondEvent).toBeDefined();
  });
});

function getPropertyFromEvent (event: any, propertyName: string) {
  return event.Properties.find((p: any) => p.Name === propertyName).Value;
}

function getMessageFromEvent (event: any) {
  return event.MessageTemplateTokens[0].Text;
}

function getRandom () {
  return Math.round(Math.random() * 1000000).toString();
}

async function queryEvent (filter: string) {
  const response = await axios.get(`${process.env.SEQ_API_URL}/api/events/signal?filter=${encodeURIComponent(filter)}&count=1&render=true&shortCircuitAfter=100&apiKey=${process.env.SEQ_API_KEY}`);
  if (response.data.Events.length === 0) {
    return undefined;
  }
  return response.data.Events[0];
}

async function queryEvents (filter: string) {
  const response = await axios.get(`${process.env.SEQ_API_URL}/api/events/signal?filter=${encodeURIComponent(filter)}&count=150&shortCircuitAfter=100&apiKey=${process.env.SEQ_API_KEY}`);
  return response.data.Events;
}
