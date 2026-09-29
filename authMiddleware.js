const jwt = require("jsonwebtoken");
const { jwtConfig } = require("../config/env");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Token de autenticacao ausente." });
  }

  try {
    const payload = jwt.verify(token, jwtConfig.secret);
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token invalido ou expirado." });
  }
}

module.exports = { requireAuth };