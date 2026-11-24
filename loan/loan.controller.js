const loanService = require('./loan.service');

const loanController = {
    create: async (req, res) => {
        const loan = await loanService.create({
            bookId: req.body.bookId,
            readerId: req.body.readerId,
            userId: req.user.id
        });
        return res.status(201).json(loan);
    },
    findAll: async (req, res) => {
        const loans = await loanService.findAll(req.query.status);
        return res.json(loans);
    },
    findByReader: async (req, res) => {
        const loans = await loanService.findByReader(req.params.id);
        return res.json(loans);
    },
    returnById: async (req, res) => {
        const loan = await loanService.returnById(req.params.id);
        return res.json(loan);
    }
};

module.exports = loanController;