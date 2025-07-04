import jwt from 'jsonwebtoken';
import { subscriptionDb, userDb } from '../database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, async (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }

        try {
            const dbUser = await userDb.findById(user.id);
            if (!dbUser || !dbUser.is_active) {
                return res.status(403).json({ error: 'User not found or inactive' });
            }

            req.user = dbUser;
            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            return res.status(500).json({ error: 'Authentication error' });
        }
    });
}

export function requireSubscription(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    subscriptionDb.hasActiveSubscription(req.user.id)
        .then(hasSubscription => {
            if (!hasSubscription) {
                return res.status(402).json({
                    error: 'Active subscription required',
                    message: 'Please purchase access to use the medical exam system'
                });
            }
            next();
        })
        .catch(error => {
            console.error('Subscription check error:', error);
            return res.status(500).json({ error: 'Subscription verification error' });
        });
}

export function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

export function verifyToken(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) reject(err);
            else resolve(decoded);
        });
    });
} 