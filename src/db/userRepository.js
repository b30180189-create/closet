import db from "./database.js";

const insertUserStmt = db.prepare(
  "INSERT INTO users (email, password_hash) VALUES (@email, @password_hash)"
);
const selectByEmailStmt = db.prepare("SELECT * FROM users WHERE email = ?");
const selectByIdStmt = db.prepare("SELECT * FROM users WHERE id = ?");

export const createUser = (email, passwordHash) => {
  const info = insertUserStmt.run({ email, password_hash: passwordHash });
  return selectByIdStmt.get(info.lastInsertRowid);
};

export const findUserByEmail = (email) => selectByEmailStmt.get(email);
export const findUserById = (id) => selectByIdStmt.get(id);
