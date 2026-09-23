const mysql = require('mysql2/promise');

function createDatabase(config) {
  return mysql.createPool(config);
}

module.exports = { createDatabase };
