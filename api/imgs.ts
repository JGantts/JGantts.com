const express = require('express');
const log4js = require("log4js");

const { promisePug } = require(`../../pug-extensions.js`);

const fs = require('graceful-fs').promises;
const path = require('path');
const url = require('url');
let serveStatic = require('serve-static')

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { JsonDB, Config } = require('node-json-db');
const argon2 = require("argon2");
const crypto = require("crypto");

const logger = log4js.getLogger();

const { CONSTS } = require("../../globalConstants.js")

const ROLES = {
  deity: "deity",
  cleric: "cleric",
}

const hashingConfig = { // based on OWASP cheat sheet recommendations (as of March, 2022)
  parallelism: 1,
  memoryCost: 64000, // 64 mb
  timeCost: 3 // number of itetations
}


/*
  Routers
*/

let backdoorRouter = express.Router();

backdoorRouter.use((req, res, next) => {
  logger.backdoor(`${req.ip} -- ${req.session.id} -- ${req.method} ${req.originalUrl}`)
  next()
})

let backdoorPrivate = express.Router();

backdoorPrivate.get('/*', serveStatic(CONSTS.PRIVATE_DIR, { maxAge: CONSTS.APP_CONFIG.staticFile.cacheMaxAgeInMinutes*60*1000 }))

backdoorRouter.get('*', backdoorPrivate)

backdoorRouter.all('*', require('./authentication.js').router)

backdoorRouter.get('*', require('./frontend.js'))

backdoorRouter.post('*', require('./backend.js'))

module.exports = backdoorRouter
