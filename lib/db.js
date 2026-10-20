import { neon } from '@neondatabase/serverless';

let sql;

export function getDb() {
  const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('NEON_DATABASE_URL não configurada');
  }
  if (!sql) sql = neon(connectionString);
  return sql;
}
