'use strict';
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const crypto = require('crypto');

const rootConfig = {
  host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
  port: Number(process.env.TEST_DB_PORT || process.env.DB_PORT || 3306),
  user: process.env.TEST_DB_USER || process.env.DB_USER || 'root',
  password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || '',
  multipleStatements: true
};
const schemaSql = fs.readFileSync(path.join(__dirname, '..', '..', 'db.sql'), 'utf8');

async function createTestDatabase() {
  const dbName = (process.env.TEST_DB_NAME ? `${process.env.TEST_DB_NAME}_` : 'tckt_test_') +
    `${process.pid}_${crypto.randomBytes(4).toString('hex')}`;
  const admin = await mysql.createConnection(rootConfig);
  await admin.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4`);
  await admin.changeUser({ database: dbName });
  await admin.query(schemaSql);
  await admin.end();
  const pool = mysql.createPool({ ...rootConfig, database: dbName, multipleStatements: false, waitForConnections: true, connectionLimit: 5 });
  return {
    pool,
    async teardown() {
      await pool.end();
      const admin2 = await mysql.createConnection(rootConfig);
      await admin2.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
      await admin2.end();
    }
  };
}

module.exports = { createTestDatabase };
