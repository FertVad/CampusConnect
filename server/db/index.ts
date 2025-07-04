import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from '@shared/schema';

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create the Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Function to test the database connection
export async function testConnection() {
  try {
    await pool.query('SELECT NOW()');
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Function to close the database connection pool
export async function closeConnection() {
  await pool.end();
}