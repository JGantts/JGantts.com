import { NextFunction } from "connect";
import express, { Express, Request, Response } from 'express';
import Jimp from "jimp"
// @ts-ignore
import multer from 'multer'
//const log4js = require("log4js");
import { encode as blurhashEncode } from "blurhash";
import { getLogger } from "log4js";
const inkjet = require('inkjet');
const log4js = require("log4js");
let logger = log4js.getLogger()

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const url = require('url');
let serveStatic = require('serve-static')

//const { JsonDB, Config } = require('node-json-db');

//const logger = log4js.getLogger();

/*
  Routers
*/
let logsRouter = express.Router();

logsRouter.all('*', (req: Request, res: Response, next: NextFunction) => {
  //logger.communication(req.path)
  next()
})

logsRouter.get('/level',
  async (req, res) => {
    res.send(JSON.stringify(logger.level)).end()
  }
)

logsRouter.post('/log',
  async (req, res) => {
    let message = req.body.logmessage
    switch (req.body.logtype) {
    case 'communication':
      logger.communication(message)
      break
    case 'atomic':
      logger.atomic(message)
      break
    case 'trace':
      logger.trace(message)
      break
    case 'entry':
      logger.entry(message)
      break
    case 'debug':
      logger.debug(message)
      break
    case 'info':
      logger.info(message)
      break
    case 'backdoor':
      logger.backdoor(message)
      break
    case 'warn':
      logger.warn(message)
      break
    case 'error':
      logger.error(message)
      break
    case 'fatal':
      logger.fatal(message)
      break
    default:
      logger.warn(message)
      break
    }
    res.status(200).end()
  }
)

module.exports = logsRouter
