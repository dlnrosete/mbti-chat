import db from './db.js';
import fs from 'fs';

async function init() {
  const sql = fs.readFileSync('schema.sql', 'utf8');
  const dbconn = await db;
  await dbconn.exec(sql);
  console.log('DB initialized');
}

init();
