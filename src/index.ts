const cluster = require('cluster');
import express from 'express';
import path from 'path';
var url = require('url');
var async = require('async');
var fs = require('graceful-fs').promises;
const log4js = require("log4js");

exports.isAlive = async () => {
    return true;
}

exports.start = async () => {
    const APP_NAME = "jgantts-website";
    const PUBLIC_DIR = path.join(path.dirname(await fs.realpath(__filename)), 'PUBLIC');

    log4js.configure({
        appenders: { publish: { type: "file", filename: `${APP_NAME}.log` } },
        categories: { default: { appenders: ["publish"], level: "error" } }
    });
    const logger = log4js.getLogger();
    logger.level = "debug";

    logger.debug(`${APP_NAME} starting`);

    const PORT_HTTP = 80;
    const PORT_HTTPS = 443;

    let listenResponse = (): void => {
        logger.debug(`Node Site #${process.pid} started`);
    }

    const app = express();

    if (process.env.NODE_SITE_PUB_ENV !== 'prod') {
        app.listen(PORT_HTTP, listenResponse);
    } else {
        const httpServer = express();
        httpServer.listen(PORT_HTTP, listenResponse);
        httpServer.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            logger.debug(`what: ${req.protocol}`);
            logger.debug(`Redirect to ${'https://' + req.hostname + req.url}`);
            res.redirect('https://' + req.hostname + req.url);
        })
        app.listen(PORT_HTTPS, listenResponse);
    }

    app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let path = req.url;
        logger.debug(`Request${path}`);
        if (path[path.length - 1] !== '/') {
            req.url = path + '/';
        }
        next();
    })

    app.get('/admin/*', async (req: express.Request, res: express.Response) => {
        let path = req.url;

        if (path === "/admin/error/crash/") {
            logger.debug("Admin-effected crash.");
            cluster.worker.kill();
        } else if (path === "/admin/error/500/") {
            res.writeHead(500, {'Content-Type': 'text/html'});
            res.write("<p>Hello, Admin</p>");
            res.write(`<p>Here's your ${'500'} error.</p>`);
        } else {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write("<p>Hello, Admin</p>");
            res.write(`<p>Here's your ${'200'} response.</p>`);
        }
        res.end();
    });

    app.get('/*', async (req: express.Request, res: express.Response) => {
        let query = url.parse(req.url, true);
        let fileName = path.join(PUBLIC_DIR, query.pathname);
        if(path.parse(fileName).ext === "") {
            fileName += 'index.html'
        }
        fileName = path.resolve(fileName);
        try {
            let contents = await fs.readFile(fileName);
            let contentType: string
            switch(path.parse(fileName).ext) {
                case '.html': contentType = 'text/html';
                break;

                case '.css': contentType = 'text/css';
                break;

                case '.js': contentType = 'application/javascript';
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

                case '.pdf': contentType = 'application/pdf';
                break;

                default: throw Error('Unrecognized file type');
                break;
            }
            res.writeHead(200, {'Content-Type': contentType});
            res.write(contents);
        } catch (e) {
            let err = e as Error
            if (err) {
                res.writeHead(500, {'Content-Type': 'text/html'});
                res.write("<p>500 - It's not you, it's us.</p>");
                logger.debug(JSON.stringify(fileName));
                logger.debug(err.message);
            }
        }
        res.end();
    });
}
