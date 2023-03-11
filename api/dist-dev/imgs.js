"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jimp_1 = __importDefault(require("jimp"));
// @ts-ignore
const multer_1 = __importDefault(require("multer"));
//const log4js = require("log4js");
const blurhash_1 = require("blurhash");
const inkjet = require('inkjet');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const url = require('url');
let serveStatic = require('serve-static');
//const { JsonDB, Config } = require('node-json-db');
//const logger = log4js.getLogger();
/*
  Routers
*/
let imgsRouter = express_1.default.Router();
imgsRouter.all('*', (req, res, next) => {
    next();
});
imgsRouter.get('/gallery/main', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let dirs = yield getDirectories(path.resolve(`${process.env.APP_IMG_FILES}/img/`));
    let photoMetas = dirs.map((dir) => {
        return {
            id: dir,
            dimensionsRatio: 2,
            blurHash: getBlurhash(dir)
        };
    });
    console.log("hi");
    // @ts-ignore
    res.setHeader('Access-Control-Allow-Origin', process.env.APP_ENDPOINT);
    res.send(JSON.stringify(photoMetas));
}));
function getDirectories(source) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!fsSync.existsSync(source)) {
            yield fs.mkdir(source, { recursive: true });
        }
        return (yield fs.readdir(source, { withFileTypes: true }))
            //.filter(dirent => dirent.isDirectory())
            .map((dirent) => dirent.name);
    });
}
imgsRouter.get('/img/:imgID/w-:imgWidth.jpg', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    //logger.trace(`check static files under ${req.app.locals.PRIVATE_DIR}`)
    let width = Math.floor(Number(req.params.imgWidth));
    if (width > 2560) {
        width = 2560;
    }
    let fileName = `${process.env.APP_IMG_FILES}/img/${req.params.imgID}/w-${width}.jpg`;
    fileName = path.resolve(fileName);
    let contents = getFileContents_makeIfNeeded(fileName, () => __awaiter(void 0, void 0, void 0, function* () {
        generateImageAtWidth(req.params.imgID, width);
    }));
    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
    res.write(contents);
    res.end();
}));
function generateImageAtWidth(imgID, width) {
    return __awaiter(this, void 0, void 0, function* () {
        let original = `${process.env.APP_IMG_FILES}/img/${imgID}/full-size.jpg`;
        let generate = `${process.env.APP_IMG_FILES}/img/${imgID}/w-${width}.jpg`;
        original = path.resolve(original);
        generate = path.resolve(generate);
        //logger.trace(`no static file ${query.pathname} under ${req.app.locals.PRIVATE_DIR} due to ${err}`)
        //(original)
        let image = yield jimp_1.default.read(original);
        image.scaleToFit(width, image.bitmap.height);
        image.quality(90);
        yield image.writeAsync(generate);
    });
}
function getBlurhash(imgID) {
    return __awaiter(this, void 0, void 0, function* () {
        let width320 = `${process.env.APP_IMG_FILES}/img/${imgID}/w-320.jpg`;
        let fileName = `${process.env.APP_IMG_FILES}/img/${imgID}/blurhash.txt`;
        fileName = path.resolve(fileName);
        width320 = path.resolve(width320);
        let contents = yield getFileContents_makeIfNeeded(fileName, () => __awaiter(this, void 0, void 0, function* () {
            yield generateImageAtWidth(imgID, 320);
            let contents320 = yield fs.readFile(width320);
            let blurhash = yield new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                //console.log(fileName)
                inkjet.decode(contents320, function (err, decoded) {
                    // decoded: { width: number, height: number, data: Uint8Array }
                    if (err) {
                        console.log(err);
                        //logger.debug()
                    }
                    else {
                        //console.log("wut")
                        resolve((0, blurhash_1.encode)(decoded.data, decoded.width, decoded.height, 4, 4));
                    }
                });
            }));
            console.log(blurhash);
            fs.writeFile(fileName, blurhash);
        }));
        console.log(contents);
        return contents;
    });
}
function getDimensionsRatio(imgID) {
    return __awaiter(this, void 0, void 0, function* () {
        let fullSize = `${process.env.APP_IMG_FILES}/img/${imgID}/full-size.jpg`;
        let fileName = `${process.env.APP_IMG_FILES}/img/${imgID}/dimensionsRatio.txt`;
        fileName = path.resolve(fileName);
        fullSize = path.resolve(fullSize);
        let contents = yield getFileContents_makeIfNeeded(fileName, () => __awaiter(this, void 0, void 0, function* () {
            let dimensionsRatio = yield new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                inkjet.decode((yield fs.readFile('./image.jpg')), function (err, decoded) {
                    // decoded: { width: number, height: number, data: Uint8Array }
                    if (err) {
                        //logger.debug()
                    }
                    else {
                        return decoded.width / decoded.height;
                    }
                });
            }));
            fs.writeFile(fileName, dimensionsRatio);
        }));
        return Number(contents);
    });
}
function getFileContents_makeIfNeeded(filePath, make) {
    return __awaiter(this, void 0, void 0, function* () {
        let fileStat;
        try {
            fileStat = yield fs.stat(filePath);
        }
        catch (err) {
            if (err.message.startsWith('ENOENT')) {
                yield make();
            }
            else {
                //logger.error(err)
                throw err;
            }
        }
        let contents = yield fs.readFile(filePath);
        return contents;
    });
}
imgsRouter.get('/upload', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.send(`<form method="post" enctype="multipart/form-data" action="./upload"><input type="file" name="file"><br/><br/><input type="submit" value="Submit"></form>`);
}));
const upload = (0, multer_1.default)({
    dest: `${process.env.APP_IMG_FILES}/tmp`,
    // you might also want to set some limits: https://github.com/expressjs/multer#limits
    limits: {
        // 1MB * 100
        fileSize: 104857600
    }
});
imgsRouter.post("/upload", (req, res, next) => {
    next();
}, upload.single("file" /* name attribute of <file> element in your form */), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let newID = makeid(20);
    // @ts-ignore
    const tempPath = path.resolve(req.file.path);
    const targetDir = path.resolve(`${process.env.APP_IMG_FILES}/img/${newID}/`);
    const targetPath = path.resolve(`${targetDir}/full-size.jpg`);
    const fileTypes = [".jpeg", ".jpg"];
    // @ts-ignore
    if (fileTypes.includes(path.extname(req.file.originalname).toLowerCase())) {
        yield fs.mkdir(targetDir);
        yield fs.rename(tempPath, targetPath);
        res
            .status(200)
            .contentType("text/plain")
            .end("File uploaded!");
    }
    else {
        fs.unlink(tempPath, (err) => {
            if (err)
                return handleError(err, res);
            res
                .status(403)
                .contentType("text/plain")
                .end(`Only ${fileTypes} file types are allowed!`);
        });
    }
}));
function handleError(err, res) {
    res.status(500);
    res.end;
}
function makeid(length) {
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
module.exports = imgsRouter;
