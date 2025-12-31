import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    const { id } = req.query;
    const filePath = path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(filePath, 'utf8');

    // Default metadata
    let title = 'Barberos - Tu App de Citas';
    let description = 'Agenda tu cita fácilmente en los mejores negocios.';
    let image = 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80'; // Default banner

    if (id) {
        try {
            // Fetch business data from Firestore REST API (No Auth required for public read if rules allow)
            // Using "businesses" collection as defined in App.js
            const firestoreUrl = `https://firestore.googleapis.com/v1/projects/barberos-bd/databases/(default)/documents/businesses/${id}`;
            const response = await fetch(firestoreUrl);

            if (response.ok) {
                const data = await response.json();
                const fields = data.fields;

                if (fields) {
                    // Extract fields (Firestore REST API returns typed values)
                    if (fields.name) title = fields.name.stringValue || title;
                    if (fields.subtitle) description = fields.subtitle.stringValue || description;
                    if (fields.banner) image = fields.banner.stringValue || image; // Prioritize Banner for social share
                    else if (fields.logo) image = fields.logo.stringValue || image;
                }
            }
        } catch (error) {
            console.error("Error fetching metadata:", error);
        }
    }

    // Replace placeholders
    html = html.replace('<!-- __META_OG_TITLE__ -->', `
        <meta property="og:title" content="${title}">
        <meta name="twitter:title" content="${title}">
    `);

    html = html.replace('<!-- __META_OG_DESCRIPTION__ -->', `
        <meta property="og:description" content="${description}">
        <meta name="twitter:description" content="${description}">
    `);

    html = html.replace('<!-- __META_OG_IMAGE__ -->', `
        <meta property="og:image" content="${image}">
        <meta name="twitter:image" content="${image}">
        <meta name="twitter:card" content="summary_large_image">
    `);

    // Set correct content type
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
}
