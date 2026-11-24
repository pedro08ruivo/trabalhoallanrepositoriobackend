const bcrypt = require('bcrypt');
const User = require('./user.model');
const httpError = require('../lib/httpError');

const userService = {
    create: async (userData) => {
        if (typeof userData.password !== 'string' || !userData.password) {
            throw httpError(400, 'password is required.');
        }
        const data = { ...userData };
        data.password = await bcrypt.hash(data.password, 10);
        return User.create(data);
    },
    findById: async (id) => {
        return await User.findByPk(id);
    },
    findByEmail: async (email) => {
        return await User.findOne({ where: { email } });
    },
    findAll: async () => {
        return await User.findAll();
    },
    update: async (id, changes) => {
        const user = await User.findByPk(id);
        if (!user) return null;

        const allowed = {};
        for (const field of ['name', 'username', 'email', 'isAdmin', 'active']) {
            if (changes[field] !== undefined) allowed[field] = changes[field];
        }
        if (changes.password) {
            allowed.password = await bcrypt.hash(changes.password, 10);
        }
        await user.update(allowed);
        return user;
    }
};

module.exports = userService;