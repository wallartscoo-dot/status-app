import { pool, withTransaction } from "../config/db";
import { hashPassword, comparePassword } from "../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { ApiError } from "../utils/ApiError";
import type { SignupInput, LoginInput } from "../validators/auth.validators";
import type { UserRow, ProfileRow } from "../types/db";

function issueTokens(user: Pick<UserRow, "id" | "username" | "role">) {
  const accessToken = signAccessToken({ sub: user.id, username: user.username, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id });
  return { accessToken, refreshToken };
}

export async function signup(input: SignupInput) {
  const [existingEmail, existingUsername] = await Promise.all([
    pool.query<UserRow>("SELECT id FROM users WHERE email = $1", [input.email]),
    pool.query<UserRow>("SELECT id FROM users WHERE username = $1", [input.username]),
  ]);

  if (existingEmail.rowCount) throw ApiError.conflict("Email already registered", { field: "email" });
  if (existingUsername.rowCount) throw ApiError.conflict("Username already exists", { field: "username" });

  const passwordHash = await hashPassword(input.password);

  const { user, profile } = await withTransaction(async (client) => {
    const { rows } = await client.query<UserRow>(
      `INSERT INTO users (full_name, username, email, password_hash)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [input.fullName, input.username, input.email, passwordHash]
    );
    const user = rows[0];

    const { rows: profileRows } = await client.query<ProfileRow>(
      `INSERT INTO profiles (user_id) VALUES ($1) RETURNING *`,
      [user.id]
    );

    await client.query(
      `INSERT INTO notifications (user_id, type, title, body) VALUES ($1, 'WELCOME', $2, $3)`,
      [
        user.id,
        "Welcome to Status App! 🎉",
        "Find the perfect status in seconds. Start exploring trending statuses now.",
      ]
    );

    return { user, profile: profileRows[0] };
  });

  const tokens = issueTokens(user);
  return { user, profile, ...tokens };
}

export async function login(input: LoginInput) {
  const identifier = input.identifier.trim().toLowerCase();

  const { rows } = await pool.query<UserRow>(
    `SELECT * FROM users WHERE email = $1 OR username = $1 LIMIT 1`,
    [identifier]
  );
  const user = rows[0];

  if (!user) throw ApiError.unauthorized("Invalid credentials");
  if (user.is_banned) throw ApiError.forbidden("This account has been suspended");

  const valid = await comparePassword(input.password, user.password_hash);
  if (!valid) throw ApiError.unauthorized("Invalid credentials");

  const { rows: profileRows } = await pool.query<ProfileRow>(
    "SELECT * FROM profiles WHERE user_id = $1",
    [user.id]
  );

  const tokens = issueTokens(user);
  return { user, profile: profileRows[0] ?? null, ...tokens };
}

export async function refresh(refreshToken: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const { rows } = await pool.query<UserRow>("SELECT * FROM users WHERE id = $1", [payload.sub]);
  const user = rows[0];
  if (!user || user.is_banned) throw ApiError.unauthorized("Invalid refresh token");

  return issueTokens(user);
}

export async function requestPasswordReset(email: string) {
  const { rows } = await pool.query<UserRow>("SELECT id FROM users WHERE email = $1", [
    email.toLowerCase(),
  ]);
  // Always respond success-shaped even if the user doesn't exist, to avoid
  // leaking which emails are registered.
  if (!rows[0]) return { sent: true };

  // Phase 2 stub: token generation + email delivery wire up once an email
  // provider (e.g. SES/Postmark) is chosen. For now we just acknowledge.
  return { sent: true };
}
