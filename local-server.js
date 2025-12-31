import http from 'http';
import url from 'url';
import handler from './api/index.js';

const PORT = 3000;

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    req.query = parsedUrl.query;

    // Mock Vercel/Express response methods
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

    // Serve static files if needed, or route everything to handler
    // Since vercel.json rewrites / to /api/index.js, we just send everything there.
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
