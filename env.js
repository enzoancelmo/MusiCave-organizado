const PORT = Number(process.env.PORT || 3000);

const dbConfig = {
  user: process.env.POSTGRES_USER || "musicave",
  host: process.env.POSTGRES_HOST || "localhost",
  database: process.env.POSTGRES_DB || "musicave",
  password: process.env.POSTGRES_PASSWORD || "musicave",
  port: Number(process.env.POSTGRES_PORT || 5432),
};

const jwtConfig = {
  secret: process.env.JWT_SECRET || "dev-secret-troque-isso-em-producao",
  expiresIn: process.env.JWT_EXPIRES_IN || "7d",
};

module.exports = {
  PORT,
  dbConfig,
  jwtConfig,
};