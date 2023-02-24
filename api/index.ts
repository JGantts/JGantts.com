require('dotenv').config()
import express, { Express, Request, Response } from 'express';
let serveStatic = require('serve-static');
let path = require('path')

const api: Express = express()
const port = process.env.API_PORT

api.use('/photo-library/', require('./imgs'))

api.get('/api/*', (req: Request, res: Response) => {
  res.send(`You'd like a function, eh?`);
})

if (process.env.APP_STATIC_FILES) {
  api.get('/*', serveStatic(process.env.APP_STATIC_FILES, { maxAge: 30*60*1000 }))

  api.get('/*', (req: Request, res: Response) => {
    res.set('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, process.env.APP_STATIC_FILES, 'index.html'))
  })
}

api.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
})
