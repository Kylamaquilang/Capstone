import bcrypt from 'bcryptjs';
import { pool } from '../database/db.js';

const SALT_ROUNDS = 12;
const DEFAULT_STUDENT_PASSWORD = process.env.DEFAULT_STUDENT_PASSWORD || 'cpc123';

// Detect if a password looks like a bcrypt hash
const isBcryptHash = (value) => typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);

const run = async () => {
  try {
    const [rows] = await pool.query('SELECT id, password FROM users');

    const toUpdate = rows.filter((u) => !isBcryptHash(u.password));
    if (toUpdate.length === 0) {
      console.log('No plaintext passwords found. Nothing to do.');
      process.exit(0);
    }

    console.log(`Hashing ${toUpdate.length} plaintext password(s)...`);
    const hashed = await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, SALT_ROUNDS);

    const ids = toUpdate.map((u) => u.id);
    const placeholders = ids.map(() => '?').join(',');
    await pool.query(
      `UPDATE users SET password = ?, must_change_password = 1 WHERE id IN (${placeholders})`,
      [hashed, ...ids]
    );

    console.log('Done. Updated user IDs:', ids.join(','));
    process.exit(0);
  } catch (err) {
    console.error('Error hashing passwords:', err.message);
    process.exit(1);
  }
};

run();



