import 'dotenv/config';
import { Pool } from 'pg';

async function test() {
  const url = process.env.DATABASE_URL;
  console.log('Testing connection to:', url?.split('@')[1] || 'URL NOT SET');
  
  const pool = new Pool({ 
    connectionString: url,
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await pool.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT 1');
    console.log('Query result:', res.rows[0]);
    client.release();
  } catch (err) {
    console.error('Connection failed:', err);
  } finally {
    await pool.end();
  }
}

test();
