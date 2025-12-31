import http from 'http';
import url from 'url';
import fs from 'fs';
import path from 'path';
import handler from './api/index.js';

const PORT = 3000;

// MIME types dictionary
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;

    // Helper to send response
    res.send = (body) => {
        res.end(body);
    };
    res.json = (json) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(json));
    };
    res.status = (statusCode) => {
        res.statusCode = statusCode;
        return res;
    };

    // 1. Try to serve static file
    // Remove query string and decode
    const filePath = path.join(process.cwd(), pathname === '/' ? 'index.html' : pathname);
    const extname = String(path.extname(filePath)).toLowerCase();

    // Only try to serve as static if it has an extension (likely a file) AND exists
    // Exception: The root '/' is handled by the API handler in Vercel usually, but here request handler logic is mixed.
    // However, the issue is that /js/app.js is being handled by the API handler which returns index.html.
    // We should check if the file exists physically.

    if (extname && fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
        const contentType = mimeTypes[extname] || 'application/octet-stream';
        try {
            const content = fs.readFileSync(filePath);
            res.setHeader('Content-Type', contentType);
            // Disable caching for local development
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.end(content, 'utf-8');
            return;
        } catch (err) {
            console.error(`Error serving static file ${filePath}:`, err);
            // Fall through to API handler or 500
        }
    }

    // 2. If not a static file, pass to API Handler (Vercel Rewrites)
    // The vercel.json rewrites everything to /api/index.js if it matches /(.*)
    // But typically static files take precedence.
    req.query = parsedUrl.query;
    try {
        await handler(req, res);
    } catch (err) {
        console.error(err);
        res.statusCode = 500;
        res.end('Internal Server Error');
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
