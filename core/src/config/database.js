const mysql = require('mysql2/promise');

function createDatabase(config) {
  const poolConfig = {
    ... config,
    timezone: '+07:00'
  };
  return mysql.createPool(poolConfig);
}

module.exports = { createDatabase };
