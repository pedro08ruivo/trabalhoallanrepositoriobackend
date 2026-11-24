const authService = require('./auth.service');

const authController = {
    async login(req, res) {
        const tokens = await authService.login(req.body.email, req.body.password);
        return res.json(tokens);
    },

    async refresh(req, res) {
        const tokens = await authService.refresh(req.body.refreshToken);
        return res.json(tokens);
    },

    async logout(req, res) {
        const accessToken = req.header('Authorization')?.replace(/^Bearer\s+/i, '');
        const result = await authService.logout(accessToken, req.body.refreshToken, req.user.id);
        return res.json(result);
    },

    async me(req, res) {
        const user = await authService.getCurrentUser(req.user.id);
        return res.json(user);
    }
};

module.exports = authController;