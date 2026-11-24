const { Category, Book } = require('../models');
const httpError = require('../lib/httpError');

const categoryController = {
    findAll: async (req, res) => res.json(await Category.findAll({ order: [['name', 'ASC']] })),
    create: async (req, res) => {
        const { name, description } = req.body;
        if (!name?.trim()) throw httpError(400, 'name is required.');
        const category = await Category.create({ name: name.trim(), description: description || null });
        return res.status(201).json(category);
    },
    findById: async (req, res) => {
        const category = await Category.findByPk(req.params.id, {
            include: [{ model: Book, as: 'books', attributes: ['id', 'title', 'isbn'] }]
        });
        if (!category) throw httpError(404, 'Category not found.');
        return res.json(category);
    },
    update: async (req, res) => {
        const category = await Category.findByPk(req.params.id);
        if (!category) throw httpError(404, 'Category not found.');
        const { name, description } = req.body;
        await category.update({
            ...(name !== undefined && { name: name.trim() }),
            ...(description !== undefined && { description })
        });
        return res.json(category);
    },
    delete: async (req, res) => {
        const category = await Category.findByPk(req.params.id);
        if (!category) throw httpError(404, 'Category not found.');
        if (await Book.count({ where: { categoryId: category.id } })) {
            throw httpError(409, 'Cannot delete a category while it contains books.');
        }
        await category.destroy();
        return res.status(204).end();
    }
};

module.exports = categoryController;