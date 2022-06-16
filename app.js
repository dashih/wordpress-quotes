'use strict';

const fs = require('fs');
const fastify = require('fastify')( { logger: true });
const mariadb = require('mariadb');
const cheerio = require('cheerio');

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const listenIp = config.listenIp;
const port = config.port;
const pool = mariadb.createPool({
    host: config.dbHost,
    database: config.db,
    user: config.dbUser,
    password: config.dbPassword,
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
    await fastify.listen({ port: port });
})();
