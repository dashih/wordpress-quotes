'use strict';

const fastify = require('fastify')( { logger: true });
const mariadb = require('mariadb');
const cheerio = require('cheerio');

const port = 80;
const pool = mariadb.createPool({
    host: process.env.WORDPRESS_DB_HOST,
    database: process.env.WORDPRESS_DB_NAME,
    user: process.env.WORDPRESS_DB_USER,
    password: process.env.WORDPRESS_DB_PASSWORD,
    connectionLimit: 1
});

// Returns JSON for all quotes. Intended for processing.
fastify.get('/api/getAllQuotes', async (request, reply) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM wp_posts WHERE post_title = \'Quote\' AND post_type = \'post\'');
        const res = [];
        for (const row of rows) {
            const $ = cheerio.load(row.post_content);
            res.push({
                speaker: $('cite').text(),
                quote: $('p').text()
            });
        }

        return res;
    } finally {
        if (conn) {
            conn.end();
        }
    }
});

// Returns text for a random quote. Intended to be output directly.
fastify.get('/api/getRandomQuote', async (request, reply) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM wp_posts WHERE post_title = \'Quote\' AND post_type = \'post\' ORDER BY RAND() LIMIT 1');
        const $ = cheerio.load(rows[0].post_content);
        const speaker = $('cite').text();
        const quote = $('p').html().replace(/<br\s*[\/]?>/gi, '\n');
        return `
${quote}

- ${speaker}

`;
    } finally {
        if (conn) {
            conn.end();
        }
    }
});

(async () => {
    await fastify.listen({ port: port, host: '0.0.0.0' });
})();
