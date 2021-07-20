"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const seq = __importStar(require("seq-logging"));
const winston_transport_1 = __importDefault(require("winston-transport"));
var WinstonLevels;
(function (WinstonLevels) {
    WinstonLevels["error"] = "error";
    WinstonLevels["warn"] = "warn";
    WinstonLevels["info"] = "info";
    WinstonLevels["http"] = "http";
    WinstonLevels["verbose"] = "verbose";
    WinstonLevels["debug"] = "debug";
    WinstonLevels["silly"] = "silly";
})(WinstonLevels || (WinstonLevels = {}));
//
// Inherit from `winston-transport` so you can take advantage
// of the base functionality and `.exceptions.handle()`.
//
class SeqTransport extends winston_transport_1.default {
    constructor(config, opts = {}) {
        super(Object.assign(opts));
        this.logger = new seq.Logger(config);
        setImmediate(() => this.emit('opened'));
    }
    /**
   * Writes to the stream associated with this instance.
   * @param {Info} info - Winston log information.
   * @param {Function} next - Continuation to respond to when complete.
   * @returns {void}
   */
    log(info, next) {
        const { level, message, ...rest } = info;
        const timestamp = new Date();
        setImmediate(() => {
            this.logger.emit({
                timestamp,
                level: this.mapLevel(level),
                messageTemplate: message,
                properties: rest,
                /*
                  exception:
                    Unsure if this can be used 🤷‍♂️
                    super has a handleExceptions option 💡
                */
            });
            setImmediate(() => this.emit('logged', info));
        });
        next();
    }
    close() {
        setImmediate(() => {
            this.logger.flush().then(() => {
                setImmediate(() => this.emit('flushed', this.logger));
                this.logger.close().then(() => {
                    setImmediate(() => this.emit('closed', this.logger));
                });
            });
        });
    }
    mapLevel(level) {
        switch (level) {
            // Note: There is no equivalent for the Seq 'Fatal'
            case WinstonLevels.error: return 'Error';
            case WinstonLevels.warn: return 'Warning';
            case WinstonLevels.http:
            case WinstonLevels.info: return 'Information';
            case WinstonLevels.debug: return 'Debug';
            case WinstonLevels.silly:
            case WinstonLevels.verbose: return 'Verbose';
            default:
                throw new Error(`Unknown logging level ${level}`);
        }
    }
}
exports.default = SeqTransport;
//# sourceMappingURL=index.js.map