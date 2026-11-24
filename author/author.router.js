const { Router } = require('express');
const authMiddleware = require('../auth/auth.middleware');
const isAdmin = require('../auth/isAdmin.middleware');
const authorController = require('./author.controller');

const router = Router();

router.use(authMiddleware);
router.get('/', authorController.findAll);
router.get('/:id', authorController.findById);
router.post('/', isAdmin, authorController.create);
router.put('/:id', isAdmin, authorController.update);
router.patch('/:id', isAdmin, authorController.update);
router.delete('/:id', isAdmin, authorController.delete);

module.exports = router;