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
let imgsRouter = express.Router();

imgsRouter.all('*', (req: Request, res: Response, next: NextFunction) => {
  logger.communication(req.path)
  next()
})

imgsRouter.get('/gallery/main', 
  async (req, res) => {
    //console.log("wut")
    let dirs = await getDirectories(path.resolve(`${process.env.APP_IMG_FILES}/img/`))
    let photoMetas = dirs
      .filter((dir: string) => dir[0] !== '.')
      .map(async (dir: string) => {
        return {
          id: dir,
          dimensionsRatio: await getDimensionsRatio(dir),
          averageColor: await getBlurhash(dir, 1),
          blurHash: await getBlurhash(dir, 9)
        }
      })

    photoMetas = await Promise.all(photoMetas)

    // @ts-ignore
    res.setHeader('Access-Control-Allow-Origin', process.env.APP_ENDPOINT)
    res.send(JSON.stringify(photoMetas))
  }
)

async function getDirectories(source: String){
  if (!fsSync.existsSync(source)){
    await fs.mkdir(source, { recursive: true });
  }
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
     let fileName = `${process.env.APP_IMG_FILES}/img/${req.params.imgID}/w-${width}.jpg`

     fileName = path.resolve(fileName)

     let contents = await getFileContents_makeIfNeeded(
      fileName,
      async () => {
        await generateImageAtWidth(req.params.imgID, width)
      }
    )


     res.writeHead(200, { 
      'Content-Type': 'image/jpeg',
      // @ts-ignore
      'Access-Control-Allow-Origin': process.env.APP_ENDPOINT
     })
     res.write(contents);
     res.end();
   }
)

imgsRouter.get('/img/:imgID/h-:imgHeight.jpg', 
   async (req, res, next) => {
     //logger.trace(`check static files under ${req.app.locals.PRIVATE_DIR}`)
     let height = Math.floor(Number(req.params.imgHeight))
     if (height > 2560) {
      height = 2560
     }
     let fileName = `${process.env.APP_IMG_FILES}/img/${req.params.imgID}/h-${height}.jpg`

     fileName = path.resolve(fileName)

     let contents = await getFileContents_makeIfNeeded(
      fileName,
      async () => {
        await generateImageAtHeight(req.params.imgID, height)
      }
    )

     res.writeHead(200, { 
      'Content-Type': 'image/jpeg',
      // @ts-ignore
      'Access-Control-Allow-Origin': process.env.APP_ENDPOINT
     })
     res.write(contents);
     res.end();
   }
)


imgsRouter.get('/img/:imgID/blurhash-:hashSize',
  async (req, res, next) => {

    // @ts-ignore
    res.setHeader('Access-Control-Allow-Origin', process.env.APP_ENDPOINT)
    res.send(JSON.stringify(await getBlurhash(req.params.imgID, Number(req.params.hashSize))))
  }
)

async function generateImageAtWidth(imgID: string, width: number) {
  let original = `${process.env.APP_IMG_FILES}/img/${imgID}/full-size.jpg`
  let generate = `${process.env.APP_IMG_FILES}/img/${imgID}/w-${width}.jpg`
  original = path.resolve(original)
  generate = path.resolve(generate)

  //logger.trace(`no static file ${query.pathname} under ${req.app.locals.PRIVATE_DIR} due to ${err}`)
  //(original)
  let image = await Jimp.read(original);
  image.scaleToFit(width, image.bitmap.height)
  image.quality(90)
  await image.writeAsync(generate)  
}

async function generateImageAtHeight(imgID: string, height: number) {
  let original = `${process.env.APP_IMG_FILES}/img/${imgID}/full-size.jpg`
  let generate = `${process.env.APP_IMG_FILES}/img/${imgID}/h-${height}.jpg`
  original = path.resolve(original)
  generate = path.resolve(generate)

  //logger.trace(`no static file ${query.pathname} under ${req.app.locals.PRIVATE_DIR} due to ${err}`)
  //(original)
  let image = await Jimp.read(original);
  image.scaleToFit(image.bitmap.width, height)
  image.quality(90)
  await image.writeAsync(generate)  
}

async function getBlurhash(imgID: string, hashSize: number): Promise<string> {
  let width320 = `${process.env.APP_IMG_FILES}/img/${imgID}/w-40.jpg`
  let fileName = `${process.env.APP_IMG_FILES}/img/${imgID}/blurhash-${hashSize}.txt`
  fileName = path.resolve(fileName)
  width320 = path.resolve(width320)

  let contents = await getFileContents_makeIfNeeded(
    fileName,
    async () => {
      await generateImageAtWidth(imgID, 40)
      let contents320 = await fs.readFile(width320)
      let blurhash = await new Promise(
        async resolve => {
          //console.log(fileName)
          inkjet.decode(contents320, function(err: any, decoded: any) {
            // decoded: { width: number, height: number, data: Uint8Array }
            if (err) {
              console.log(err)
              //logger.debug()
            } else {
              //console.log("wut")
              resolve(blurhashEncode(decoded.data, decoded.width, decoded.height, hashSize, hashSize));
            }
          });
      })
      
      //console.log(blurhash)

      await fs.writeFile(fileName, blurhash)
    }
  )
  //console.log(contents.toString())

  //console.log(imgID)
  return contents.toString()
}

async function getDimensionsRatio(imgID: string): Promise<number> {
  let fullSize = `${process.env.APP_IMG_FILES}/img/${imgID}/full-size.jpg`
  let fileName = `${process.env.APP_IMG_FILES}/img/${imgID}/dimensionsRatio.txt`
  fileName = path.resolve(fileName)
  fullSize = path.resolve(fullSize)

  //console.log(`${imgID} - 11`)
  let contents = await getFileContents_makeIfNeeded(
    fileName,
    async () => {
      let dimensionsRatio: any = await new Promise(
        async (resolve) => {
          inkjet.decode((await fs.readFile(fullSize)), function(err: any, decoded: any) {
            // decoded: { width: number, height: number, data: Uint8Array }
            if (err) {
              logger.error(err.message)
              resolve(1)
            } else {
              resolve(decoded.width/decoded.height)
            }
          })
        })

      await fs.writeFile(fileName, dimensionsRatio.toString())
    }
  )
  //console.log(`${imgID} - 14`)

  //(Number(contents.toString()))
  return Number(contents.toString())
}

async function getFileContents_makeIfNeeded(filePath: string, make: () => void) {
  let fileStat
  try {
    fileStat = await fs.stat(filePath)
  } catch (err: any) {
      if (err.message.startsWith('ENOENT')) {
        await make()
      } else {
        //logger.error(err)
        throw err
      }
  }

  let contents = await fs.readFile(filePath)
  return contents
}

imgsRouter.get('/upload', async (req, res) => {
  res.send(`<form method="post" enctype="multipart/form-data" action="./upload"><input type="file" name="file"><br/><br/><input type="submit" value="Submit"></form>`)
})

const upload = multer({
  dest: `${process.env.APP_IMG_FILES}/tmp`,
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
    const tempPath = path.resolve(req.file.path)
    const targetDir = path.resolve(`${process.env.APP_IMG_FILES}/img/${newID}/`);
    const targetPath = path.resolve(`${targetDir}/full-size.jpg`);

    const fileTypes = [".jpeg", ".jpg", ".png"]

    // @ts-ignore
    if (fileTypes.includes(path.extname(req.file.originalname).toLowerCase())) {

      await fs.mkdir(targetDir)
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
          .end(`Only ${fileTypes} file types are allowed!`);
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
