# `winston-seq` [![npm](https://img.shields.io/npm/v/@datalust/winston-seq.svg)](https://www.npmjs.com/package/@datalust/winston-seq)

A [Winston](https://github.com/winstonjs/winston) v3 transport that sends structured logs to the [Seq log server](https://datalust.co/seq).

![Structured logging with Seq](assets/seq-log-search-feature-2220w.gif)

## Getting started

Add the `@datalust/winston-seq winston` and `winston` packages to your `package.json`, and configure `winston` with a `SeqTransport`:

```ts
import winston from 'winston';
import { SeqTransport } from '@datalust/winston-seq';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(  /* This is required to get errors to log with stack traces. See https://github.com/winstonjs/winston/issues/1498 */
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { /* application: 'your-app-name' */ },
  transports: [
    new winston.transports.Console({
        format: winston.format.simple(),
    }),
    new SeqTransport({
      serverUrl: "https://your-seq-server:5341",
      apiKey: "your-api-key",
      onError: (e => { console.error(e) }),
      handleExceptions: true,
      handleRejections: true,
    })
  ]
});
```

* `serverUrl` - the URL for your Seq server's ingestion
* `apiKey` - (optional) The [Seq API Key](https://docs.datalust.co/docs/getting-logs-into-seq#api-keys) to use
* `onError` - Callback to execute when an error occurs within the transport 
* `handleExceptions` - (optional) Send an event [when an uncaught exception occurs](https://github.com/winstonjs/winston#handling-uncaught-exceptions-with-winston)
* `handleRejections` - (optional) Send an event [when an unhandled promise rejection occurs](https://github.com/winstonjs/winston#handling-uncaught-promise-rejections-with-winston)

## Send Log Events

Send structured log events, with properties that can be used later for filtering and analysis:

```ts
logger.info("Hello {name}", {name: "World"});
```

Attach context by creating child loggers:

```ts
const taskLogger = logger.child({ activity: "purchase" });
taskLogger.debug(
    "User {user} purchase product {product} at ${price}", 
    {
        user: "Millie Gilbert",
        product: "Yardtime Garden Shears",
        price: 29.99
    });
```

![An event in Seq](assets/purchase.png)
