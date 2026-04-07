import pg from "pg";

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "booknotes",
  password: "sam341@",
  port: 5432,
});

db.connect();

export default db;