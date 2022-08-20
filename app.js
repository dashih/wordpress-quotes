'use strict';

const fs = require('fs');
const fastify = require('fastify')( { logger: true });
const mariadb = require('mariadb');
const cheerio = require('cheerio');

const dbPassword = process.env.WORDPRESS_DB_PASSWORD == undefined ?
    fs.readFileSync(process.env.WORDPRESS_DB_PASSWORD_FILE, 'utf8') :
    process.env.WORDPRESS_DB_PASSWORD;
const port = 80;
const pool = mariadb.createPool({
    host: process.env.WORDPRESS_DB_HOST,
    database: process.env.WORDPRESS_DB_NAME,
    user: process.env.WORDPRESS_DB_USER,
    password: dbPassword,
    connectionLimit: 1
});

fastify.get('/api/getRandomQuote', async (request, reply) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM wp_posts WHERE post_title = \'Quotes\' AND post_type = \'post\'');
        const $ = cheerio.load(rows[0].post_content);
        const blockquotes = $('blockquote');
        const randomBq = blockquotes[Math.floor(Math.random() * blockquotes.length)];
        const speaker = $('cite', randomBq).text();
        const quote = $('p', randomBq).html().replace(/<br\s*[\/]?>/gi, '\n');
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
