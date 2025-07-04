import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new sqlite3.Database(path.join(__dirname, 'medical_exam.db'));

// Initialize database tables
export function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Users table
            db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME,
          is_active BOOLEAN DEFAULT 1
        )
      `);

            // Payments table
            db.run(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          stripe_payment_intent_id TEXT UNIQUE NOT NULL,
          amount INTEGER NOT NULL,
          currency TEXT DEFAULT 'usd',
          status TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

            // User subscriptions table
            db.run(`
        CREATE TABLE IF NOT EXISTS user_subscriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          payment_id INTEGER NOT NULL,
          expires_at DATETIME NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (payment_id) REFERENCES payments (id)
        )
      `);

            // Session data table
            db.run(`
        CREATE TABLE IF NOT EXISTS session_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          session_data TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

// User operations
export const userDb = {
    create: (email, passwordHash, name) => {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
                [email, passwordHash, name],
                function (err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, email, name });
                }
            );
        });
    },

    findByEmail: (email) => {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM users WHERE email = ?',
                [email],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    },

    findById: (id) => {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM users WHERE id = ?',
                [id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    },

    updateLastLogin: (id) => {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
};

// Payment operations
export const paymentDb = {
    create: (userId, stripePaymentIntentId, amount, status) => {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO payments (user_id, stripe_payment_intent_id, amount, status) VALUES (?, ?, ?, ?)',
                [userId, stripePaymentIntentId, amount, status],
                function (err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });
    },

    updateStatus: (stripePaymentIntentId, status) => {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE stripe_payment_intent_id = ?',
                [status, stripePaymentIntentId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    },

    findByStripeId: (stripePaymentIntentId) => {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM payments WHERE stripe_payment_intent_id = ?',
                [stripePaymentIntentId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }
};

// Subscription operations
export const subscriptionDb = {
    create: (userId, paymentId, expiresAt) => {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO user_subscriptions (user_id, payment_id, expires_at) VALUES (?, ?, ?)',
                [userId, paymentId, expiresAt],
                function (err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });
    },

    findActiveByUserId: (userId) => {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM user_subscriptions WHERE user_id = ? AND is_active = 1 AND expires_at > CURRENT_TIMESTAMP ORDER BY expires_at DESC LIMIT 1',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    },

    hasActiveSubscription: (userId) => {
        return new Promise((resolve, reject) => {
            db.get(
                'SELECT COUNT(*) as count FROM user_subscriptions WHERE user_id = ? AND is_active = 1 AND expires_at > CURRENT_TIMESTAMP',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count > 0);
                }
            );
        });
    }
};

export default db; 