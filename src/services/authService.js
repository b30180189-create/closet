import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { createUser, findUserByEmail } from "../db/userRepository.js";
import { HttpError } from "../utils/errors.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const MIN_PASSWORD_LENGTH = 8;
const SALT_ROUNDS = 12;

const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  created_at: user.created_at
});

const generateToken = (user) =>
  jwt.sign({ sub: user.id, email: user.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });

const validateCredentials = (email, password) => {
  if (!EMAIL_REGEX.test(email)) {
    throw new HttpError(400, "Please provide a valid email address.");
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(
      400,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
    );
  }
};

export const signupUser = async (email, password) => {
  validateCredentials(email, password);

  const existing = findUserByEmail(email);
  if (existing) {
    throw new HttpError(409, "An account with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = createUser(email, passwordHash);
  const token = generateToken(user);
  return { token, user: sanitizeUser(user) };
};

export const loginUser = async (email, password) => {
  validateCredentials(email, password);

  const user = findUserByEmail(email);
  if (!user) {
    throw new HttpError(401, "Invalid email or password.");
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new HttpError(401, "Invalid email or password.");
  }

  const token = generateToken(user);
  return { token, user: sanitizeUser(user) };
};
