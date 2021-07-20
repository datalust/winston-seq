import * as seq from 'seq-logging';
import TransportStream from 'winston-transport';
declare class SeqTransport extends TransportStream {
    logger: seq.Logger;
    constructor(config: seq.SeqLoggerConfig, opts?: TransportStream.TransportStreamOptions);
    /**
   * Writes to the stream associated with this instance.
   * @param {Info} info - Winston log information.
   * @param {Function} next - Continuation to respond to when complete.
   * @returns {void}
   */
    log(info: unknown, next: () => void): void;
    close(): void;
    private mapLevel;
}
export default SeqTransport;
//# sourceMappingURL=index.d.ts.map