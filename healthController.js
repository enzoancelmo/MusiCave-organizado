const pool = require("../db/pool");

async function getHealth(req, res) {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "connected" });
  } catch (error) {
    res.status(500).json({ ok: false, database: "offline", error: error.message });
  }
}

module.exports = {
  getHealth,
};
