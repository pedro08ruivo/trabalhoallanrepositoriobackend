const { Router } = require('express');
const authMiddleware = require('../auth/auth.middleware');
const isAdmin = require('../auth/isAdmin.middleware');
const categoryController = require('./category.controller');

const router = Router();

router.use(authMiddleware);
router.get('/', categoryController.findAll);
router.get('/:id', categoryController.findById);
router.post('/', isAdmin, categoryController.create);
router.put('/:id', isAdmin, categoryController.update);
router.patch('/:id', isAdmin, categoryController.update);
router.delete('/:id', isAdmin, categoryController.delete);

module.exports = router;