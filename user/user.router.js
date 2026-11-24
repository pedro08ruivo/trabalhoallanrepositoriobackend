const {Router} = require('express');
const router = Router();

const userController = require('./user.controller');
const authMiddleware = require('../auth/auth.middleware');
const isAdmin = require('../auth/isAdmin.middleware');

router.use(authMiddleware, isAdmin);
router.post('/', userController.create);
router.get('/:id', userController.findById);
router.get('/email/:email', userController.findByEmail);
router.put('/:id', userController.update);
router.patch('/:id', userController.update);
router.patch('/:id/active', userController.setActive);
router.get('/', userController.findAll);

module.exports = router;