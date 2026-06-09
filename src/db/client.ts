import { drizzle } from "drizzle-orm/mysql2";
import type { MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

export async function createDb(hyperdrive: Hyperdrive) {
  const connection = await mysql.createConnection({
    host: hyperdrive.host,
    user: hyperdrive.user,
    password: hyperdrive.password,
    database: hyperdrive.database,
    port: hyperdrive.port,
    disableEval: true,
    charset: "utf8mb4",
  });
  return drizzle(connection);
}
