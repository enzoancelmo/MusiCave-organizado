const express = require("express");
const cors = require("cors");
const { FRONTEND_DIR } = require("./config/paths");
const albumsRoutes = require("./routes/albumsRoutes");
const authRoutes = require("./routes/authRoutes");
const healthRoutes = require("./routes/healthRoutes");
const { register, login } = require("./controllers/authController");

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static(FRONTEND_DIR));

app.use("/api", healthRoutes);
app.use("/api/albums", albumsRoutes);
app.use("/api", authRoutes);

// Compatibility with the old login server endpoints.
app.post("/cadastro", register);
app.post("/login", login);

module.exports = app;
