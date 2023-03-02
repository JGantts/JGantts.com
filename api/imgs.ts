import { NextFunction } from "connect";
import express, { Express, Request, Response } from 'express';
import Jimp from "jimp"
// @ts-ignore
import multer from 'multer'
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

imgsRouter.get('/gallery/main', 
  async (req, res) => {
    let dirs = await getDirectories(path.resolve('imgs/img/'))
    // @ts-ignore
    res.setHeader('Access-Control-Allow-Origin', process.env.APP_ENDPOINT)
    res.send(JSON.stringify(dirs))
  }
)

async function getDirectories(source: String){
  return (await fs.readdir(source, { withFileTypes: true }))
    //.filter(dirent => dirent.isDirectory())
    .map((dirent: any) => dirent.name)
}

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

imgsRouter.get('/upload', async (req, res) => {
  res.send(`<form method="post" enctype="multipart/form-data" action="./upload"><input type="file" name="file"><br/><br/><input type="submit" value="Submit"></form>`)
})

const upload = multer({
  dest: "./tmp/uploaded/files",
  // you might also want to set some limits: https://github.com/expressjs/multer#limits
  limits: {
    // 1MB * 100
    fileSize: 104857600
  }
});

imgsRouter.post(
  "/upload",
  (req, res, next) => {
    next()
  },
  upload.single("file" /* name attribute of <file> element in your form */),
  async (req, res) => {
    let newID = makeid(20)
    // @ts-ignore
    const tempPath = path.join(__dirname, `../${req.file.path}`)
    const targetPath = path.join(__dirname, `../imgs/img/${newID}/full-size.jpg`);

    // @ts-ignore
    if (path.extname(req.file.originalname).toLowerCase() === ".jpeg") {

      await fs.mkdir(`imgs/img/${newID}/`)
      await fs.rename(tempPath, targetPath)

      res
        .status(200)
        .contentType("text/plain")
        .end("File uploaded!");
      
    } else {
      fs.unlink(tempPath, (err: any) => {
        if (err) return handleError(err, res);

        res
          .status(403)
          .contentType("text/plain")
          .end("Only .png files are allowed!");
      });
    }
  }
);

function handleError(err: Error, res: Response) {
  res.status(500)
  res.end
}

function makeid(length: number) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

module.exports = imgsRouter
