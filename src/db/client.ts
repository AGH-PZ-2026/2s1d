import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

export function createDb(hyperdrive: Hyperdrive) {
  const pool = mysql.createPool({
    host: hyperdrive.host,
    user: hyperdrive.user,
    password: hyperdrive.password,
    database: hyperdrive.database,
    port: hyperdrive.port,
    disableEval: true,
    charset: "utf8mb4",
  });
  return drizzle(pool);
}
