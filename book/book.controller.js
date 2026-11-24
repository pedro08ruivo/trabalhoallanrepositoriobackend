const { Transaction, Op } = require('sequelize');
const db = require('../config/db');
const { Book, Category, Author, Loan, BookAuthor } = require('../models');
const httpError = require('../lib/httpError');

function parseId(value, field) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw httpError(400, `${field} must be a positive integer.`);
    return id;
}

function parseCopies(value, field) {
    const count = Number(value);
    if (!Number.isInteger(count) || count < 0) throw httpError(400, `${field} must be a non-negative integer.`);
    return count;
}

async function validateAuthors(authorIds, transaction) {
    if (!Array.isArray(authorIds)) throw httpError(400, 'authorIds must be an array.');
    const ids = [...new Set(authorIds.map((id) => parseId(id, 'authorIds')))];
    const count = await Author.count({ where: { id: ids }, transaction });
    if (count !== ids.length) throw httpError(400, 'One or more authors do not exist.');
    return ids;
}

const bookController = {
    findAll: async (req, res) => {
        const where = {};
        if (req.query.categoryId) where.categoryId = parseId(req.query.categoryId, 'categoryId');
        if (req.query.authorId) {
            const authorId = parseId(req.query.authorId, 'authorId');
            const links = await BookAuthor.findAll({ where: { authorId }, attributes: ['bookId'] });
            where.id = { [Op.in]: links.map((link) => link.bookId) };
        }
        if (req.query.title) where.title = { [Op.like]: `%${req.query.title}%` };
        if (req.query.available === 'true') where.availableCopies = { [Op.gt]: 0 };
        const books = await Book.findAll({
            where,
            include: [
                { model: Category, as: 'category' },
                { model: Author, as: 'authors', through: { attributes: [] } }
            ],
            order: [['title', 'ASC']]
        });
        return res.json(books);
    },
    create: async (req, res) => db.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
        const { title, isbn, year, authorIds = [] } = req.body;
        if (!title?.trim() || !isbn?.trim()) throw httpError(400, 'title and isbn are required.');
        const categoryId = parseId(req.body.categoryId, 'categoryId');
        const totalCopies = parseCopies(req.body.totalCopies ?? 0, 'totalCopies');
        const category = await Category.findByPk(categoryId, { transaction });
        if (!category) throw httpError(404, 'Category not found.');
        const parsedAuthorIds = await validateAuthors(authorIds, transaction);
        const book = await Book.create({
            title: title.trim(), isbn: isbn.trim(), year: year ?? null,
            totalCopies, availableCopies: totalCopies, categoryId
        }, { transaction });
        await book.setAuthors(parsedAuthorIds, { transaction });
        return res.status(201).json(await Book.findByPk(book.id, {
            include: [
                { model: Category, as: 'category' },
                { model: Author, as: 'authors', through: { attributes: [] } }
            ], transaction
        }));
    }),
    findById: async (req, res) => {
        const book = await Book.findByPk(req.params.id, {
            include: [
                { model: Category, as: 'category' },
                { model: Author, as: 'authors', through: { attributes: [] } }
            ]
        });
        if (!book) throw httpError(404, 'Book not found.');
        return res.json(book);
    },
    update: async (req, res) => db.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
        const book = await Book.findByPk(req.params.id, { transaction });
        if (!book) throw httpError(404, 'Book not found.');

        const changes = {};
        for (const field of ['title', 'isbn', 'year']) {
            if (req.body[field] !== undefined) changes[field] = field === 'title' || field === 'isbn'
                ? String(req.body[field]).trim()
                : req.body[field];
        }
        if (req.body.categoryId !== undefined) {
            const categoryId = parseId(req.body.categoryId, 'categoryId');
            if (!await Category.findByPk(categoryId, { transaction })) throw httpError(404, 'Category not found.');
            changes.categoryId = categoryId;
        }
        if (req.body.totalCopies !== undefined) {
            const totalCopies = parseCopies(req.body.totalCopies, 'totalCopies');
            const checkedOut = book.totalCopies - book.availableCopies;
            if (totalCopies < checkedOut) {
                throw httpError(409, `totalCopies cannot be less than the ${checkedOut} copies currently on loan.`);
            }
            changes.totalCopies = totalCopies;
            changes.availableCopies = totalCopies - checkedOut;
        }
        await book.update(changes, { transaction });
        if (req.body.authorIds !== undefined) {
            await book.setAuthors(await validateAuthors(req.body.authorIds, transaction), { transaction });
        }
        return res.json(await Book.findByPk(book.id, {
            include: [
                { model: Category, as: 'category' },
                { model: Author, as: 'authors', through: { attributes: [] } }
            ], transaction
        }));
    }),
    delete: async (req, res) => db.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
        const book = await Book.findByPk(req.params.id, { transaction });
        if (!book) throw httpError(404, 'Book not found.');
        const loanCount = await Loan.count({ where: { bookId: book.id }, transaction });
        if (loanCount) {
            const openLoans = await Loan.count({ where: { bookId: book.id, returnDate: null }, transaction });
            const reason = openLoans
                ? 'Cannot delete a book with active or overdue loans.'
                : 'Cannot delete a book with loan history.';
            throw httpError(409, reason);
        }
        await book.destroy({ transaction });
        return res.status(204).end();
    })
};

module.exports = bookController;