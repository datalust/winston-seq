# `winston-seq`

A Winston v3 transport for Seq that sends structured logs to the [Seq Log Server](https://datalust.co/seq).

## Getting Started

```sh
$ npm install @datalust/winston-seq
# Or with yarn
$ yarn add @datalust/winston-seq
```

```ts
const winston = require('winston');
const seq = require('@datalust/winston-seq');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.Console({
        format: winston.format.simple(),
    }),
    new seq({
      serverUrl: "https://your-seq-server:5341",
      apiKey: "your-api-key",
      onError: (e => { console.error(e) }),
      handleExceptions: true,
      handleRejections: true,
    })
  ]
});
```

TODO: explain config. Link to docs about api keys. Maybe add a Seq screenshot. 

## Contributing

First [Install Yarn](https://yarnpkg.com/getting-started/install) if you don't already have it. Next, add a `.env` file with content like:

```
SEQ_URL=http://192.168.98.99:5341
SEQ_API_KEY=fsf7sa9f9sf7s9df7
```

Where `SEQ_URL` is the ingestion address of a test Seq server and `SEQ_API_KEY` is an API key with the `Ingest` permission. 