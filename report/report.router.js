const { Router } = require('express');
const authMiddleware = require('../auth/auth.middleware');
const isAdmin = require('../auth/isAdmin.middleware');
const reportService = require('./report.service');

const router = Router();
router.use(authMiddleware, isAdmin);
router.get('/dashboard', async (req, res) => {
    res.json(await reportService.getDashboard());
});

module.exports = router;
