/* eslint-disable jest/expect-expect */
import winston from 'winston'
import winstonSeq from '../src/index'

describe('@integration', () => {
  it('should log to the docker Seq server', async () => {
    const seq = new winstonSeq({
      onError: console.error,
    })
    const logger = winston.createLogger({
      level: 'debug',
      defaultMeta: { service: 'test-service' },
      transports: [seq],
    })

    const child = logger.child({ someContext: [1, 2, 3] })
    child.debug('debug {service} {someContext}')
    child.info('info {service} {someContext}')
    child.warn('warn {service} {someContext}')
    child.error('error {service} {someContext}')
    child.error('error with Error', new Error('some error'))
    child.error(new Error('Error'))

    return new Promise(resolve => {
      seq.on('flushed', () => {
        console.log('Received seq:flushed')
      })
      seq.on('closed', () => {
        console.log('Received seq:closed')
        resolve(null)
      })
      logger.close()
    })
  })
})
