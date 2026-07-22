const { Pool } = require("pg");
const { dbConfig } = require("../config/env");

const pool = new Pool(dbConfig);

module.exports = pool;
