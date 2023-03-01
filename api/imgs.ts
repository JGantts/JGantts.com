import { NextFunction } from "connect";
import express, { Express, Request, Response } from 'express';
import Jimp from "jimp"
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

imgsRouter.get('/img/:imgID/w-:imgWidth.jpg', 
   async (req, res, next) => {
     //logger.trace(`check static files under ${req.app.locals.PRIVATE_DIR}`)
     let width = Math.floor(Number(req.params.imgWidth))
     if (width > 2560) {
      width = 2560
     }
     let fullSize = `imgs/img/${req.params.imgID}/full-size.jpg`
     let fileName = `imgs/img/${req.params.imgID}/w-${width}.jpg`

     fileName = path.resolve(fileName);
     fullSize = path.resolve(fullSize);
     let fileStat
     try {
       fileStat = await fs.stat(fileName)
     } catch (err: any) {
      console.log(err.message)
       if (err.message.startsWith('ENOENT')) {
         //logger.trace(`no static file ${query.pathname} under ${req.app.locals.PRIVATE_DIR} due to ${err}`)
         let image = await Jimp.read(fullSize);
         image.scaleToFit(width, image.bitmap.height)
         image.quality(90)
         await image.writeAsync(fileName)
       } else {
         //logger.error(err)
         res.sendStatus(500)
         return
       }
     }

     let contents = await fs.readFile(fileName)

     res.writeHead(200, { 'Content-Type': 'image/jpeg' });
     res.write(contents);
     res.end();
   }
)

imgsRouter.post('/img', async (req, res) => {

})

module.exports = imgsRouter
