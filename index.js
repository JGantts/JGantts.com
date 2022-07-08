const log4js = require('log4js');
const website = require('./dist/out/index.js');

const APP_NAME = "jgantts-website-local-publisher";

process.env.NODE_SITE_PUB_ENV = 'dev';

log4js.configure({
  appenders: { publish: { type: "file", filename: `${APP_NAME}.log` } },
  categories: { default: { appenders: ["publish"], level: "error" } }
});
const logger = log4js.getLogger();
logger.level = "debug";

logger.debug("Begin Log");

logger.debug(`Node Site #${process.pid} starting`);
website.start();
logger.debug(`Node Site #${process.pid} started`);
