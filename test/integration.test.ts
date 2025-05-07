import { expect } from 'chai'
import winston from 'winston'
import axios from 'axios'
import { config } from 'dotenv'
import { SeqTransport } from '../src/index.js'

config()

let logger: winston.Logger, transport: SeqTransport

describe('winston-seq', () => {
  before(() => {
    transport = new SeqTransport({
      serverUrl: seqUrl(),
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

  after(() => {
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
        random
      });
    await transport.flush();
    const event = await queryEvent(`random = '${random}'`);
    expect(getPropertyFromEvent(event, 'user')).to.eq("Millie Gilbert");
    expect(getPropertyFromEvent(event, 'application')).to.eq("logtests");
    expect(getPropertyFromEvent(event, 'product')).to.eq("Yardtime Garden Shears");
    expect(getPropertyFromEvent(event, 'price')).to.eq(29.99);
    expect(event.RenderedMessage).to.eq('User Millie Gilbert purchase product Yardtime Garden Shears at $29.99');

  })

  it('should send with child logger context', async () => {
    const random = getRandom();
    const childLogger = logger.child({ requestId: 451 })
    childLogger.info('Logging from child', { random });
    await transport.flush();
    const event = await queryEvent(`random = '${random}'`);
    expect(getPropertyFromEvent(event, 'requestId')).to.eq(451);
    expect(getMessageFromEvent(event)).to.eq('Logging from child');
  })

  it('should send 10 events', async () => {
    const random = getRandom();
    for (let n = 1; n <= 10; n++) {
      logger.info('Logging event number {n}', { n, random });
    }
    await transport.flush();
    const events = await queryEvents(`random = '${random}'`);
    expect(events.length).to.eq(10);
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
    expect(event).to.not.be.undefined;
    expect(getPropertyFromEvent(event, 'timestamp')).to.eq(tenMinutesAgo.toISOString());

  });

  it('should work with different formats', async ()=>{
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

    diffFormatLogger.info("winston-seq: tests: should work with different {whats}", {whats: "formats", random});
    diffFormatLogger.close();
    await diffFormatTransport.flush();

    const event = await queryEvent(`random = '${random}'`);
    expect(event).to.not.be.undefined;
    expect(getPropertyFromEvent(event, 'whats')).to.eq('formats');
  })

  it('should work with no API key', async ()=>{
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

    anonLogger.info("winston-seq: tests: should work with no API key", {random});
    anonLogger.close();
    await anonTransport.flush();

    const event = await queryEvent(`random = '${random}'`);
    expect(event).to.not.be.undefined;
  })

  it('should log exceptions', async ()=>{
    const random = getRandom();
    try{
      throw new Error("Test error");
    } catch (e) {
      logger.error(e as any, {random});
    }
    await transport.flush();
    const event = await queryEvent(`random = '${random}'`);
    expect(event).to.not.be.undefined;
    expect(event.Exception).to.match(/Error: Test error(.|\W)+/);
  });

  it('should log all logging levels', async ()=>{
    const random = getRandom();
    const levels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
    await Promise.all(levels.map(level => {
        logger.log(level, "winston-seq: testing: logging levels for level {level}", {level, random, test: 'should log all logging levels'});
        return transport.flush();
      }));
    const events = await queryEvents(`random = '${random}'`);
    expect(events).to.not.be.undefined;
    expect(events.some((event: any) => event.Level == 'error')).to.eq(true);
    expect(events.some((event: any) => event.Level == 'silly')).to.eq(true);
    expect(events.some((event: any) => event.Level == 'http')).to.eq(true);
    expect(events.some((event: any) => event.Level == 'warn')).to.eq(true);
    expect(events.some((event: any) => event.Level == 'info')).to.eq(true);
    expect(events.some((event: any) => event.Level == 'verbose')).to.eq(true);
    expect(events.some((event: any) => event.Level == 'debug')).to.eq(true);
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
    expect(firstEvent).to.be.undefined;

    const secondEvent = await secondEventP;
    expect(secondEvent).to.not.be.undefined;
  });
})

function seqUrl() {
    const url = process.env.SEQ_API_URL ?? process.env.SEQ_INGESTION_URL ?? "http://localhost:5341";

    return url.replace(/\/$/, '');
}

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
  const response = await axios.get(`${seqUrl()}/api/events/signal?filter=${encodeURIComponent(filter)}&count=1&render=true&shortCircuitAfter=100`);
  if (response.data.Events.length === 0) {
    return undefined;
  }
  return response.data.Events[0];
}

async function queryEvents(filter: string): Promise<any[]> {
  const response = await axios.get(`${seqUrl()}/api/events/signal?filter=${encodeURIComponent(filter)}&count=150&shortCircuitAfter=100`);
  return response.data.Events;
}
