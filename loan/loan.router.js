const { Router } = require('express');
const authMiddleware = require('../auth/auth.middleware');
const loanController = require('./loan.controller');

const router = Router();

router.use(authMiddleware);
router.get('/', loanController.findAll);
router.get('/reader/:id', loanController.findByReader);
router.post('/', loanController.create);
router.patch('/:id/return', loanController.returnById);

module.exports = router;