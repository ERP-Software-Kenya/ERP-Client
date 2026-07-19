import { getDb } from './database';
import { nowIST, futureIST } from './utils';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const SALT_ROUNDS = 10;
const SESSION_HOURS = 8;

export type UserRole = 'admin' | 'operator';

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  last_activity: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: number;
  created_at: string;
  expires_at: string;
}

// ── Check if any users exist ─────────────────────────────────────────────────
export function hasUsers(): boolean {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  return count.c > 0;
}

// ── Initial setup: create first admin ────────────────────────────────────────
export function setupUser(input: {
  name: string;
  username: string;
  password: string;
  pin: string;
}): { session: Session; user: User } {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (count.c > 0) throw new Error('Setup already completed');

  const now = nowIST();
  const passwordHash = bcrypt.hashSync(input.password, SALT_ROUNDS);
  const pinHash = bcrypt.hashSync(input.pin, SALT_ROUNDS);

  const result = db
    .prepare(
      `INSERT INTO users (username, name, password, pin, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'admin', 'active', ?, ?)`,
    )
    .run(input.username, input.name, passwordHash, pinHash, now, now);

  const userId = result.lastInsertRowid as number;

  const session: Session = {
    id: randomUUID(),
    user_id: userId,
    created_at: now,
    expires_at: futureIST(SESSION_HOURS),
  };
  db.prepare(
    'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  ).run(session.id, session.user_id, session.created_at, session.expires_at);

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
  return { session, user: rowToUser(userRow) };
}

// ── Login ────────────────────────────────────────────────────────────────────
export function login(
  username: string,
  password: string,
): { session: Session; user: User } | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM users WHERE username = ? AND status = 'active'")
    .get(username) as Record<string, unknown> | undefined;
  if (!row) return null;
  if (!bcrypt.compareSync(password, row.password as string)) return null;

  db.prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at < ?').run(row.id, nowIST());

  const loginNow = nowIST();
  const session: Session = {
    id: randomUUID(),
    user_id: row.id as number,
    created_at: loginNow,
    expires_at: futureIST(SESSION_HOURS),
  };
  db.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    session.id,
    session.user_id,
    session.created_at,
    session.expires_at,
  );
  db.prepare('UPDATE users SET last_activity = ?, updated_at = ? WHERE id = ?').run(
    loginNow,
    loginNow,
    row.id,
  );

  return { session, user: rowToUser(row) };
}

// ── Session validation ───────────────────────────────────────────────────────
export function validateSession(sessionId: string): { session: Session; user: User } | null {
  const db = getDb();
  const sessionRow = db
    .prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > ?')
    .get(sessionId, nowIST()) as Record<string, unknown> | undefined;
  if (!sessionRow) return null;

  const userRow = db
    .prepare("SELECT * FROM users WHERE id = ? AND status = 'active'")
    .get(sessionRow.user_id) as Record<string, unknown> | undefined;
  if (!userRow) return null;

  const now = nowIST();
  db.prepare('UPDATE users SET last_activity = ? WHERE id = ?').run(now, userRow.id);

  return {
    session: {
      id: sessionRow.id as string,
      user_id: sessionRow.user_id as number,
      created_at: sessionRow.created_at as string,
      expires_at: sessionRow.expires_at as string,
    },
    user: rowToUser(userRow),
  };
}

// ── PIN verification ─────────────────────────────────────────────────────────
export function verifyPin(userId: number, pin: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT pin FROM users WHERE id = ?').get(userId) as { pin: string } | undefined;
  if (!row || !row.pin) return false;
  return bcrypt.compareSync(pin, row.pin);
}

// ── Set PIN ──────────────────────────────────────────────────────────────────
export function setPin(userId: number, newPin: string): boolean {
  const db = getDb();
  const hash = bcrypt.hashSync(newPin, SALT_ROUNDS);
  const now = nowIST();
  db.prepare('UPDATE users SET pin = ?, updated_at = ? WHERE id = ?').run(hash, now, userId);
  return true;
}

// ── Change password ──────────────────────────────────────────────────────────
export function changePassword(userId: number, currentPassword: string, newPassword: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT password FROM users WHERE id = ?').get(userId) as { password: string } | undefined;
  if (!row) return false;
  if (!bcrypt.compareSync(currentPassword, row.password)) return false;
  const hash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
  const now = nowIST();
  db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?').run(hash, now, userId);
  return true;
}

// ── Logout ───────────────────────────────────────────────────────────────────
export function logout(sessionId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

// ── User management ───────────────────────────────────────────────────────────
export function getUsers(): User[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM users ORDER BY id').all() as Record<string, unknown>[];
  return rows.map(rowToUser);
}

export function getUserById(userId: number): User | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown> | undefined;
  return row ? rowToUser(row) : null;
}

export function createUser(input: {
  name: string;
  username: string;
  password: string;
  pin: string;
  role: UserRole;
}): User {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(input.username);
  if (existing) throw new Error('Username already exists');

  const now = nowIST();
  const passwordHash = bcrypt.hashSync(input.password, SALT_ROUNDS);
  const pinHash = bcrypt.hashSync(input.pin, SALT_ROUNDS);

  const result = db
    .prepare(
      `INSERT INTO users (username, name, password, pin, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
    )
    .run(input.username, input.name, passwordHash, pinHash, input.role, now, now);

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>;
  return rowToUser(userRow);
}

export function updateUser(userId: number, input: { name?: string; username?: string; role?: UserRole }): User {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown> | undefined;
  if (!existing) throw new Error('User not found');

  if (input.username && input.username !== existing.username) {
    const dup = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(input.username, userId);
    if (dup) throw new Error('Username already exists');
  }

  const now = nowIST();
  db.prepare(`UPDATE users SET name = ?, username = ?, role = ?, updated_at = ? WHERE id = ?`).run(
    input.name ?? (existing.name as string),
    input.username ?? (existing.username as string),
    input.role ?? (existing.role as string),
    now,
    userId,
  );
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
  return rowToUser(updated);
}

export function deactivateUser(userId: number): void {
  const db = getDb();
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: string } | undefined;
  if (!user) throw new Error('User not found');
  if (user.role === 'admin') {
    const adminCount = db
      .prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin' AND status = 'active'")
      .get() as { c: number };
    if (adminCount.c <= 1) throw new Error('Cannot deactivate the last admin user');
  }
  const now = nowIST();
  db.prepare("UPDATE users SET status = 'inactive', updated_at = ? WHERE id = ?").run(now, userId);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function reactivateUser(userId: number): User {
  const db = getDb();
  const now = nowIST();
  db.prepare("UPDATE users SET status = 'active', updated_at = ? WHERE id = ?").run(now, userId);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, unknown>;
  return rowToUser(updated);
}

export function adminResetPassword(userId: number, newPassword: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!row) return false;
  const hash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
  const now = nowIST();
  db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?').run(hash, now, userId);
  return true;
}

// ── Helper ───────────────────────────────────────────────────────────────────
function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as number,
    username: row.username as string,
    name: row.name as string,
    role: (row.role as UserRole) || 'operator',
    last_activity: row.last_activity as string | null,
    status: row.status as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
