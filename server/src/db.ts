import { DatabaseSync } from "node:sqlite";

export const db = new DatabaseSync(process.env.DATABASE_PATH ?? "della.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS readings (
    ts INTEGER PRIMARY KEY,
    room REAL,
    unit_temp REAL,
    target REAL,
    setpoint REAL,
    power INTEGER
  );
`);
