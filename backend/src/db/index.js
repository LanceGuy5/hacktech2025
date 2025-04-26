import mysql from 'mysql2/promise';
import { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } from '../config/index.js';

export const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
