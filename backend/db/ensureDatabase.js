const fs = require("fs/promises");
const path = require("path");
const pool = require("./pool");
const { DATABASE_DIR } = require("../config/paths");

async function ensureDatabase() {
  const schemaPath = path.join(DATABASE_DIR, "schema.sql");
  const schema = await fs.readFile(schemaPath, "utf8");
  await pool.query(schema);
}

module.exports = ensureDatabase;
