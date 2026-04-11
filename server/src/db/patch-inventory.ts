import fs from 'fs';
import path from 'path';
import { pool } from './pool';

/** Идемпотентно добавляет available_quantity к уже существующей БД (без повторного schema.sql). */
async function patch() {
  const sql = fs.readFileSync(path.join(__dirname, 'alter_available_quantity.sql'), 'utf-8');
  await pool.query(sql);
  console.log('Patch available_quantity applied');
  await pool.end();
}

patch().catch((err) => {
  console.error('Patch failed:', err);
  process.exit(1);
});
