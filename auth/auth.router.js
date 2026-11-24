const { Router } = require('express');
const router = Router();

const authController = require('./auth.controller');
const authMiddleware = require('./auth.middleware');

router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.get('/me', authMiddleware, authController.me);
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;