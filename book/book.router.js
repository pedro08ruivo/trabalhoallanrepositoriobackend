const { Router } = require('express');
const authMiddleware = require('../auth/auth.middleware');
const isAdmin = require('../auth/isAdmin.middleware');
const bookController = require('./book.controller');

const router = Router();

router.use(authMiddleware);
router.get('/', bookController.findAll);
router.get('/:id', bookController.findById);
router.post('/', isAdmin, bookController.create);
router.put('/:id', isAdmin, bookController.update);
router.patch('/:id', isAdmin, bookController.update);
router.delete('/:id', isAdmin, bookController.delete);

module.exports = router;