import log from 'electron-log/main';

log.transports.file.level = 'info';
log.transports.file.maxSize = 10 * 1024 * 1024;
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';
log.transports.console.level =
  process.env.NODE_ENV === 'development' ? 'debug' : false;

export default log;
