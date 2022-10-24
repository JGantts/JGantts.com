const log4js = require('log4js');
const website = require('./dist/out/index.js');
const express = require('express');
const http = require('http');
const httpProxy = require('http-proxy');

const APP_NAME = "jgantts-website-local-publisher";

const HTTP_PORT = 80;
const HTTPS_PORT = 443;

process.env.NODE_SITE_PUB_ENV = 'dev';

log4js.configure({
    appenders: { publish: { type: "file", filename: `${APP_NAME}.log` } },
    categories: { default: { appenders: ["publish"], level: "error" } }
});
const logger = log4js.getLogger();
logger.level = "debug";

async function launch() {
    logger.debug("Begin Log");

    await website.start();

    let port = await website.port();

    httpProxy.createProxyServer({target: `http://localhost:${port}`}).listen(3000);

    logger.debug(`Node Site #${process.pid} started @${port}`);
}

launch();
