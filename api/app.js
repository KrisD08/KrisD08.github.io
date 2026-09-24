// Libro de visitas: API del LAB-02 en Node.js (Express + pg).
//
// Toda la configuración entra por variables de entorno. Aquí no hay ni una
// contraseña ni un nombre de host escrito a mano, y así debe seguir.
const express = require("express");
const { Pool } = require("pg");

const port = process.env.PORT || 3000;
const pool = new Pool({
  host: process.env.DB_HOST || "db",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "libro",
  user: process.env.DB_USER || "app",
  password: process.env.DB_PASSWORD || "",
  connectionTimeoutMillis: 3000,
});
// Sin esto, un corte de conexión con la base tumba el proceso entero.
pool.on("error", (e) => console.error("Postgres:", e.message));

const app = express();
app.use(express.json({ limit: "10kb" }));

app.get("/api/health", async (_req, res) => {
  // "Estoy vivo" no alcanza: si no puedo hablar con la base, no estoy sano.
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (e) {
    res.status(503).json({ status: "error", detalle: e.message });
  }
});

app.get("/api/mensajes", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, nombre, mensaje, fecha FROM mensajes ORDER BY fecha DESC, id DESC LIMIT 100"
    );
    res.json(rows);
  } catch (e) { next(e); }
});

app.post("/api/mensajes", async (req, res, next) => {
  const nombre = String(req.body?.nombre ?? "").trim();
  const mensaje = String(req.body?.mensaje ?? "").trim();

  if (!nombre || !mensaje) return res.status(400).json({ error: "Faltan el nombre o el mensaje." });
  if (nombre.length > 60) return res.status(400).json({ error: "El nombre no puede pasar de 60 caracteres." });
  if (mensaje.length > 280) return res.status(400).json({ error: "El mensaje no puede pasar de 280 caracteres." });

  try {
    const { rows } = await pool.query(
      // Parámetros, nunca concatenar texto del usuario dentro del SQL.
      "INSERT INTO mensajes (nombre, mensaje) VALUES ($1, $2) RETURNING id, nombre, mensaje, fecha",
      [nombre, mensaje]
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

// JSON mal formado en el cuerpo: es culpa del cliente, no un 500.
app.use((err, _req, res, _next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "El cuerpo no es JSON válido." });
  console.error(err.message);
  res.status(500).json({ error: "Error interno." });
});

const server = app.listen(port, "0.0.0.0", () => console.log(`API escuchando en el puerto ${port}`));

// Sin esto, "docker stop" tarda 10 segundos: el proceso ignora la señal de apagado.
for (const s of ["SIGINT", "SIGTERM"]) {
  process.on(s, () => { console.log(`Señal ${s}: cerrando`); server.close(() => pool.end().then(() => process.exit(0))); });
}
