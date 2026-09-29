const path = require("path");

const ROOT_DIR = path.join(__dirname, "..", "..");
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");
const DATABASE_DIR = path.join(ROOT_DIR, "database");

module.exports = {
  ROOT_DIR,
  FRONTEND_DIR,
  DATABASE_DIR,
};
