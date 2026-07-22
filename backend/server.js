const app = require("./app");
const pool = require("./db/pool");
const ensureDatabase = require("./db/ensureDatabase");
const { PORT } = require("./config/env");

async function start() {
  try {
    await ensureDatabase();
    await pool.query("SELECT 1");

    app.listen(PORT, () => {
      console.log(`MusiCave rodando em http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Nao foi possivel iniciar o MusiCave:", error.message);
    process.exit(1);
  }
}

start();
