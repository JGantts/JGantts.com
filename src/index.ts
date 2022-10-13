
console.log(`cwd: ${process.cwd()}`);

import express from 'express';
import http from "http"
import net from 'net';
import path from 'path';
const crypto = require("crypto");
import { AddressInfo } from 'net';
const url = require('url');
const async = require('async');
const fs = require('graceful-fs').promises;
const log4js = require("log4js");

console.log(`cwd: ${process.cwd()}`);

const config = require('./config.js').config as Config.Config;

let server: http.Server;



let portInUse = (port: number): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
        var server = net.createServer(function(socket: net.Socket) {
            socket.write('Echo server\r\n');
            socket.pipe(socket);
        });

        server.on('error', function (e: Error) {
            resolve(true);
        });

        server.on('listening', function (e: Error) {
            server.close();
            resolve(false);
        });

        server.listen(port, '127.0.0.1');
    });
};


exports.heartbeat = async () => {
    return true;
};

exports.shutdown = async () => {
    await server?.close();
    return true;
};

exports.port = async () => {
    return (server?.address() as AddressInfo)?.port;
};

exports.start = async () => {
    const APP_NAME = "jgantts-website";
    const SRC_DIR = path.dirname(await fs.realpath(__filename));
    const PUBLIC_DIR = path.join(path.dirname(await fs.realpath(__filename)), 'PUBLIC');

    log4js.configure({
        appenders: {
            out: {
                type: "stdout",
                layout: {
                    type: "pattern",
                    pattern: "%d{hh.mm.ss} [work] %p %c %m"
                }
            },
            publish: { type: "file", filename: `${APP_NAME}.log` }
         },
        categories: { default: { appenders: ["publish", "out"], level: "error" } }
    });
    const logger = log4js.getLogger();
    logger.level = "debug";

    logger.debug(`${APP_NAME} starting`);
    logger.debug(new Error().stack);

    let port: number;
    let inUse: boolean;
    do {
        port = crypto.randomInt(49152, 65535);
        inUse = await portInUse(port);
    } while (inUse);

    logger.debug(`Node Site #${process.pid} selected port ${port}`);

    const app = express();
    server = app.listen(port, (): void => {
        logger.debug(`Node Site #${process.pid} started on port ${(server?.address() as AddressInfo)?.port}`);
    });

    logger.debug(`NODE_SITE_PUB_ENV: ${process.env.NODE_SITE_PUB_ENV}`);

    app.get('/admin*', (req: express.Request, res: express.Response) => {
        let reqUrl = req.url;
        logger.debug(reqUrl);
        if (reqUrl === "/admin/error/crash/") {
            logger.debug("Admin-effected crash.");
            process.exit();
        } else if (reqUrl === "/admin/error/uncaughtexception/") {
            logger.debug("Admin-effected exception.");
            throw new Error("Admin-effected exception.");
        } else if (reqUrl === "/admin/error/500/") {
            res.writeHead(500, {'Content-Type': 'text/html'});
            res.write("<p>Hey Admin. What's up?</p>");
            res.write(`<p>Here's your ${'500'} error.</p>`);
        } else {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write("<p>Hey Admin. What's up?</p>");
            res.write(`<p>Here's your ${'200'} response.</p>`);
        }
        res.end();
    });

    for (let siteKey in config.sites) {
        let site = config.sites[siteKey];
        try {
            let innerSiteApp = await require(site.path)(site.uri);
            //let innerSiteRouter = express.Router();
            //innerSiteRouter.all('*', innerSiteApp);
            app.use(site.uri, innerSiteApp);
            logger.debug(`Loaded site ${site.name}`);
            logger.debug(`Loaded to ${site.uri}`);
        } catch (e) {
            let err = e as Error
            if (err) {
                logger.debug(`Error while loading site ${site.name}`);
                logger.debug(JSON.stringify(err));
                logger.debug(err);
                logger.debug(err.message);
            }
            app.get(site.uri, async (req, res) => {
                res.end(`Site ${site.name} failed to start with server.`);
            });
        }
        app.get(site.uri, async (req, res) => {
            res.end(`Request failed to reach site ${site.name}.`);
        });
        app.post(site.uri, async (req, res) => {
            res.end(`Request failed to reach site ${site.name}.`);
        });
    }

    app.get('/api/cowlin/credits-maker/v1/', async (req: express.Request, res: express.Response) => {
        res.end( JSON.stringify({
            "heartbeat": true,
            "server": "jgantts.com",
            "serverSettingsPath": "api/cowlin/v1/",
            "adType": "classic"
        }));
    });

    app.get('/resume.pdf', async (req: express.Request, res: express.Response) => {
        let resumeName = 'ganttj_coverResumePortfolio_2022_07_12.pdf';
        let fileName = path.join(SRC_DIR, `resume/${resumeName}`);
        fileName = path.resolve(fileName);
        try {
            let contents = await fs.readFile(fileName);
            res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline;filename=${resumeName}`
            });
            res.write(contents);
        } catch (e) {
            let err = e as Error
            if (err) {
                res.writeHead(500, {'Content-Type': 'text/html'});
                res.write("<p>500 - Server Error</p>");
                res.write("<p>Resume not found</p>");
                logger.debug(JSON.stringify(err));
            }
        }
        res.end();
    });

    app.get('/*', async (req: express.Request, res: express.Response) => {
        let query = url.parse(req.url, true);
        let fileName = path.join(PUBLIC_DIR, query.pathname);
        fileName = decodeURI(fileName);
        if(path.parse(fileName).ext === "") {
            fileName += 'index.html'
        }
        fileName = path.resolve(fileName);
        try {
            let contentType: string
            switch(path.parse(fileName).ext) {
                case '.html': contentType = 'text/html';
                break;

                case '.css': contentType = 'text/css';
                break;

                case '.js': contentType = 'application/javascript';
                break;

                case '.map': contentType = 'application/json';
                break;

                case '.gif': contentType = 'image/gif';
                break;

                case '.jpeg':
                case '.jpg': contentType = 'image/jpeg';
                break;

                case '.png': contentType = 'image/png';
                break;

                case '.svg': contentType = 'image/svg+xml';
                break;

                case '.ico': contentType = 'image/x-icon';
                break;

                case '.pdf': contentType = 'application/pdf';
                break;

                case '.json': contentType = 'application/json';
                break;

                case '.xml': contentType = 'text/xml';
                break;

                case '.zip': contentType = 'application/zip';
                break;

                default: throw Error('Unrecognized file type');
                break;
            }
            let contents = await fs.readFile(fileName);
            res.writeHead(200, {'Content-Type': contentType});
            res.write(contents);
        } catch (e) {
            let err = e as Error
            if (err) {
                res.writeHead(404, {'Content-Type': 'text/html'});
                res.write("<p>404 - Not Found</p>");
                res.write("<p>Yeah...</p>");
                logger.debug(JSON.stringify(fileName));
            }
        }
        logger.debug(`${req.url}`);
        res.end();
    });

    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        logger.error(err);
        res.writeHead(500, {'Content-Type': 'text/html'});
        res.write("<p>500 - Internal Server Error</p>");
        res.write(
            `<p>Yeah...</ br>This is entirely unexpected. ` +
            `We recommend that you <span class='code'>sit by a lake<span>.</p>` +
            `<p>This recomendation vetted by <a href='https://xkcd.com/1024/'>xkcd.com</a>.</p>`
        );
        res.end()
    });
};
