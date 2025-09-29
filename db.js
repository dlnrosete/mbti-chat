import sqlite3 from "sqlite3";
import { open } from "sqlite";

const dbPromise = open({
  filename: "./mbti.db",
  driver: sqlite3.Database
});

export async function get(sql, params = []) {
  const db = await dbPromise;
  return db.get(sql, params);
}

export async function all(sql, params = []) {
  const db = await dbPromise;
  return db.all(sql, params);
}

export async function run(sql, params = []) {
  const db = await dbPromise;
  return db.run(sql, params);
}

export default dbPromise;
