"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const express_1 = __importDefault(require("express"));
let serveStatic = require('serve-static');
const api = (0, express_1.default)();
const port = process.env.API_PORT;
api.get('/imgs/*', (req, res) => {
    res.send(`You'd like an image, eh?`);
});
api.get('/api/*', (req, res) => {
    res.send(`You'd like a function, eh?`);
});
if (process.env.APP_STATIC_FILES) {
    api.get('/*', serveStatic(process.env.APP_STATIC_FILES, { maxAge: 30 * 60 * 1000 }));
}
api.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
