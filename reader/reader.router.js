const { Router } = require('express');
const authMiddleware = require('../auth/auth.middleware');
const readerController = require('./reader.controller');
const loanController = require('../loan/loan.controller');

const router = Router();

router.use(authMiddleware);
router.get('/', readerController.findAll);
router.post('/', readerController.create);
router.get('/:id/loans', loanController.findByReader);
router.get('/:id', readerController.findById);
router.put('/:id', readerController.update);
router.patch('/:id', readerController.update);
router.delete('/:id', readerController.delete);

module.exports = router;