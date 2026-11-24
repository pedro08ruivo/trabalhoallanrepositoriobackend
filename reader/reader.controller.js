const { Reader } = require('../models');
const httpError = require('../lib/httpError');

const readerController = {
    findAll: async (req, res) => res.json(await Reader.findAll({ order: [['name', 'ASC']] })),
    create: async (req, res) => {
        const { name, cpf, email, phone } = req.body;
        if (!name || !cpf) throw httpError(400, 'name and cpf are required.');
        const reader = await Reader.create({ name, cpf, email: email || null, phone: phone || null });
        return res.status(201).json(reader);
    },
    findById: async (req, res) => {
        const reader = await Reader.findByPk(req.params.id);
        if (!reader) throw httpError(404, 'Reader not found.');
        return res.json(reader);
    },
    update: async (req, res) => {
        const reader = await Reader.findByPk(req.params.id);
        if (!reader) throw httpError(404, 'Reader not found.');
        const { name, cpf, email, phone } = req.body;
        await reader.update({
            ...(name !== undefined && { name }),
            ...(cpf !== undefined && { cpf }),
            ...(email !== undefined && { email: email || null }),
            ...(phone !== undefined && { phone: phone || null })
        });
        return res.json(reader);
    },
    delete: async (req, res) => {
        const reader = await Reader.findByPk(req.params.id);
        if (!reader) throw httpError(404, 'Reader not found.');
        const loanCount = await reader.countLoans();
        if (loanCount) {
            throw httpError(409, 'Não é possível excluir um leitor com histórico de empréstimos.');
        }
        await reader.destroy();
        return res.status(204).end();
    }
};

module.exports = readerController;