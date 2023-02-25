import { NextFunction } from "connect";

import express, { Express, Request, Response } from 'express';
//const log4js = require("log4js");

const fs = require('fs').promises;
const path = require('path');
const url = require('url');
let serveStatic = require('serve-static')

//const { JsonDB, Config } = require('node-json-db');

//const logger = log4js.getLogger();

/*
  Routers
*/
let imgsRouter = express.Router();

imgsRouter.all('*', (req: Request, res: Response, next: NextFunction) => {
  next()
})

imgsRouter.get('/img/:imgID/:imgType.jpg', 
   async (req, res, next) => {
     //logger.trace(`check static files under ${req.app.locals.PRIVATE_DIR}`)
     let fileName = `imgs/img/${req.params.imgID}/${req.params.imgType}.jpg`;

     fileName = path.resolve(fileName);
     let fileStat
     try {
       fileStat = await fs.stat(fileName)
     } catch (err: any) {
      console.log(err.message)
       if (err.message.startsWith('ENOENT')) {
         //logger.trace(`no static file ${query.pathname} under ${req.app.locals.PRIVATE_DIR} due to ${err}`)
         next()
         return
       } else {
         //logger.error(err)
         res.sendStatus(500)
         return
       }
     }

     let contentType
     switch(path.parse(fileName).ext) {
        //  case '.html': contentType = 'text/html';
        //  break;

        //  case '.css': contentType = 'text/css';
        //  break;

        //  case '.js': contentType = 'application/javascript';
        //  break;

        //  case '.map': contentType = 'application/json';
        //  break;

        //  case '.gif': contentType = 'image/gif';
        //  break;

         case '.jpeg':
         case '.jpg': contentType = 'image/jpeg';
         break;

        //  case '.png': contentType = 'image/png';
        //  break;

        //  case '.svg': contentType = 'image/svg+xml';
        //  break;

        //  case '.ico': contentType = 'image/x-icon';
        //  break;

        //  case '.pdf': contentType = 'application/pdf';
        //  break;

        //  case '.json': contentType = 'application/json';
        //  break;

        //  case '.xml': contentType = 'text/xml';
        //  break;

        //  case '.eot': contentType = 'application/vnd.ms-fontobject';
        //  break;
        //  case '.ttf': contentType = 'font/ttf';
        //  break;
        //  case '.woff': contentType = 'font/woff';
        //  break;
        //  case '.woff2': contentType = 'font/woff2';
        //  break;

         default: throw Error('Unrecognized file type');
         break;
     }

     let contents = await fs.readFile(fileName);
     res.writeHead(200, {'Content-Type': contentType});
     res.write(contents);
     res.end();
   }
 )

module.exports = imgsRouter
