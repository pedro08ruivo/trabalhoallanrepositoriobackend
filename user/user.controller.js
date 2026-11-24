const userService = require("./user.service");

const publicUser = (user) => {
    const data = user.toJSON();
    delete data.password;
    return data;
};

const userController = {
    create: async (req, res) => {
        const user = await userService.create(req.body);
        return res.status(201).json(publicUser(user));
    },
    findById: async (req, res) => {
        const user = await userService.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        return res.json(publicUser(user));
    },
    findByEmail: async (req, res) => {
        const user = await userService.findByEmail(req.params.email);
        if (!user) return res.status(404).json({ error: 'User not found' });
        return res.json(publicUser(user));
    },
    findAll: async (req, res) => {
        const users = await userService.findAll();
        return res.json(users.map(publicUser));
    },
    update: async (req, res) => {
        const user = await userService.update(req.params.id, req.body);
        if (!user) return res.status(404).json({ error: 'User not found' });
        return res.json(publicUser(user));
    },
    setActive: async (req, res) => {
        if (typeof req.body.active !== 'boolean') {
            return res.status(400).json({ error: 'active must be a boolean.' });
        }
        const user = await userService.update(req.params.id, { active: req.body.active });
        if (!user) return res.status(404).json({ error: 'User not found' });
        return res.json(publicUser(user));
    }
};

module.exports = userController;