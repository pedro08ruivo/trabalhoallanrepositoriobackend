const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Transaction } = require('sequelize');
const db = require('../config/db');
const userService = require('../user/user.service');
const { User, RefreshToken, LogoutList } = require('../models');
const httpError = require('../lib/httpError');

// Teste de renovação: access token expira em 30 s. Para 15 min, use 900 s;
// 604800 s equivalem a 7 dias e são a duração do refresh token.
const ACCESS_TTL_SECONDS = 30;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

function getSecret(name) {
    const secret = process.env[name];
    if (!secret) throw httpError(500, `${name} is not configured.`);
    return secret;
}

function publicUser(user) {
    const value = user.toJSON();
    delete value.password;
    return value;
}

async function createTokenPair(user, transaction) {
    const accessToken = jwt.sign({
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
    }, getSecret('JWT_SECRET'), { expiresIn: ACCESS_TTL_SECONDS });

    const refreshToken = jwt.sign({
        id: user.id,
        jti: crypto.randomUUID()
    }, getSecret('JWT_REFRESH_SECRET'), { expiresIn: REFRESH_TTL_SECONDS });

    await RefreshToken.create({
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
        revoked: false
    }, { transaction });

    return {
        accessToken,
        refreshToken,
        user: publicUser(user)
    };
}

const authService = {
    login: async (email, password) => {
        if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
            throw httpError(400, 'email and password are required.');
        }

        const user = await userService.findByEmail(email);
        if (!user || !user.active || !await bcrypt.compare(password, user.password)) {
            throw httpError(401, 'Invalid email or password.');
        }

        return db.transaction({ type: Transaction.TYPES.IMMEDIATE }, (transaction) =>
            createTokenPair(user, transaction));
    },

    refresh: async (token) => {
        if (typeof token !== 'string' || !token) {
            throw httpError(401, 'Refresh token is required.');
        }

        // Fail clearly before opening a transaction if deployment configuration is incomplete.
        getSecret('JWT_REFRESH_SECRET');
        getSecret('JWT_SECRET');

        const result = await db.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
            const storedToken = await RefreshToken.findOne({
                where: { token },
                transaction
            });

            if (!storedToken) return { type: 'invalid' };

            if (storedToken.revoked) {
                // Return a value so the transaction commits this revocation before we respond 401.
                await RefreshToken.update({ revoked: true }, {
                    where: { userId: storedToken.userId, revoked: false },
                    transaction
                });
                return { type: 'reuse' };
            }

            let decoded;
            try {
                decoded = jwt.verify(token, getSecret('JWT_REFRESH_SECRET'));
            } catch {
                await storedToken.update({ revoked: true }, { transaction });
                return { type: 'invalid' };
            }

            if (Number(decoded.id) !== storedToken.userId || new Date(storedToken.expiresAt) <= new Date()) {
                await storedToken.update({ revoked: true }, { transaction });
                return { type: 'invalid' };
            }

            const user = await User.findByPk(storedToken.userId, { transaction });
            if (!user || !user.active) {
                await RefreshToken.update({ revoked: true }, {
                    where: { userId: storedToken.userId, revoked: false },
                    transaction
                });
                return { type: 'invalid' };
            }

            await storedToken.update({ revoked: true }, { transaction });
            return {
                type: 'success',
                tokens: await createTokenPair(user, transaction)
            };
        });

        if (result.type === 'reuse') {
            throw httpError(401, 'Refresh token reuse detected. All sessions were revoked.');
        }
        if (result.type !== 'success') {
            throw httpError(401, 'Invalid or expired refresh token.');
        }
        return result.tokens;
    },

    logout: async (accessToken, refreshToken, userId) => {
        if (typeof refreshToken !== 'string' || !refreshToken) {
            throw httpError(400, 'refreshToken is required.');
        }

        await db.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
            const storedToken = await RefreshToken.findOne({
                where: { token: refreshToken, userId },
                transaction
            });
            if (!storedToken) throw httpError(401, 'Invalid refresh token.');
            if (!storedToken.revoked) {
                await storedToken.update({ revoked: true }, { transaction });
            }
        });

        await LogoutList.findOrCreate({ where: { token: accessToken }, defaults: { token: accessToken } });
        return { message: 'Logout successful.' };
    },

    getCurrentUser: async (userId) => {
        const user = await User.findByPk(userId, { attributes: { exclude: ['password'] } });
        if (!user || !user.active) throw httpError(401, 'User is inactive or no longer exists.');
        return user;
    },

    verifyToken: async (token) => {
        const isBlacklisted = await LogoutList.findOne({ where: { token } });
        if (isBlacklisted) throw httpError(401, 'Invalid or expired token.');

        const secret = getSecret('JWT_SECRET');
        let decoded;
        try {
            decoded = jwt.verify(token, secret);
        } catch {
            throw httpError(401, 'Invalid or expired token.');
        }

        const user = await User.findByPk(decoded.id, { attributes: ['id', 'active'] });
        if (!user || !user.active) throw httpError(401, 'Invalid or expired token.');
        return decoded;
    }
};

module.exports = authService;
