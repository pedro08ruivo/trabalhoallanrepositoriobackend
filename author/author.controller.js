const { Author, Book } = require('../models');
const httpError = require('../lib/httpError');

const authorController = {
    findAll: async (req, res) => res.json(await Author.findAll({ order: [['name', 'ASC']] })),
    create: async (req, res) => {
        const { name, nationality, birthDate } = req.body;
        if (!name?.trim()) throw httpError(400, 'name is required.');
        const author = await Author.create({ name: name.trim(), nationality: nationality || null, birthDate: birthDate || null });
        return res.status(201).json(author);
    },
    findById: async (req, res) => {
        const author = await Author.findByPk(req.params.id, {
            include: [{ model: Book, as: 'books', attributes: ['id', 'title', 'isbn'] }]
        });
        if (!author) throw httpError(404, 'Author not found.');
        return res.json(author);
    },
    update: async (req, res) => {
        const author = await Author.findByPk(req.params.id);
        if (!author) throw httpError(404, 'Author not found.');
        const { name, nationality, birthDate } = req.body;
        await author.update({
            ...(name !== undefined && { name: name.trim() }),
            ...(nationality !== undefined && { nationality: nationality || null }),
            ...(birthDate !== undefined && { birthDate: birthDate || null })
        });
        return res.json(author);
    },
    delete: async (req, res) => {
        const author = await Author.findByPk(req.params.id);
        if (!author) throw httpError(404, 'Author not found.');
        const linkedBooks = await author.countBooks();
        if (linkedBooks) {
            throw httpError(409, 'Cannot delete an author while they are linked to books.');
        }
        await author.destroy();
        return res.status(204).end();
    }
};

module.exports = authorController;