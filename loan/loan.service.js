const { Transaction, Op } = require('sequelize');
const db = require('../config/db');
const { Book, Reader, User, Loan } = require('../models');
const httpError = require('../lib/httpError');

function todayDateOnly() {
    return new Date().toISOString().slice(0, 10);
}

function addDays(dateOnly, days) {
    const date = new Date(`${dateOnly}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function overdueDays(dueDate, returnDate) {
    const due = new Date(`${dueDate}T00:00:00.000Z`);
    const returned = new Date(`${returnDate}T00:00:00.000Z`);
    return Math.max(0, Math.floor((returned.getTime() - due.getTime()) / 86400000));
}

function currentStatus(loan, today = todayDateOnly()) {
    if (loan.returnDate) return 'DEVOLVIDO';
    return loan.dueDate < today ? 'ATRASADO' : 'ATIVO';
}

async function refreshLoanStatuses(where = {}) {
    const today = todayDateOnly();
    await Loan.update({ status: 'ATRASADO' }, {
        where: { ...where, returnDate: null, dueDate: { [Op.lt]: today } }
    });
    await Loan.update({ status: 'ATIVO' }, {
        where: { ...where, returnDate: null, dueDate: { [Op.gte]: today }, status: 'ATRASADO' }
    });
}

function requirePositiveId(value, field) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        throw httpError(400, `${field} must be a positive integer.`);
    }
    return id;
}

const loanService = {
    create: async ({ bookId, readerId, userId }) => {
        const parsedBookId = requirePositiveId(bookId, 'bookId');
        const parsedReaderId = requirePositiveId(readerId, 'readerId');
        const parsedUserId = requirePositiveId(userId, 'userId');

        // IMMEDIATE obtains SQLite's write reservation before checking stock and reader limits.
        return db.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
            const [book, reader, user] = await Promise.all([
                Book.findByPk(parsedBookId, { transaction }),
                Reader.findByPk(parsedReaderId, { transaction }),
                User.findByPk(parsedUserId, { transaction })
            ]);

            if (!book) throw httpError(404, 'Book not found.');
            if (!reader) throw httpError(404, 'Reader not found.');
            if (!user || !user.active) throw httpError(401, 'Active attendant not found.');
            if (book.availableCopies <= 0) {
                throw httpError(409, 'No copies of this book are currently available.');
            }

            const openLoans = await Loan.findAll({
                where: { readerId: parsedReaderId, returnDate: null },
                attributes: ['id', 'dueDate'],
                transaction
            });
            const today = todayDateOnly();

            if (openLoans.some((loan) => loan.dueDate < today)) {
                throw httpError(409, 'Reader has an overdue loan and cannot borrow another book.');
            }
            if (openLoans.length >= 3) {
                throw httpError(409, 'Reader already has the maximum of 3 active loans.');
            }

            const dueDate = addDays(today, 7);
            await book.update({ availableCopies: book.availableCopies - 1 }, { transaction });
            return Loan.create({
                loanDate: today,
                dueDate,
                returnDate: null,
                status: 'ATIVO',
                fine: 0,
                bookId: parsedBookId,
                readerId: parsedReaderId,
                userId: parsedUserId
            }, { transaction });
        });
    },

    returnById: async (id) => {
        const loanId = requirePositiveId(id, 'loanId');

        return db.transaction({ type: Transaction.TYPES.IMMEDIATE }, async (transaction) => {
            const loan = await Loan.findByPk(loanId, { transaction });
            if (!loan) throw httpError(404, 'Loan not found.');
            if (loan.returnDate) throw httpError(409, 'This loan has already been returned.');

            const book = await Book.findByPk(loan.bookId, { transaction });
            if (!book) throw httpError(409, 'The loan references a book that no longer exists.');
            if (book.availableCopies >= book.totalCopies) {
                throw httpError(409, 'Book inventory is inconsistent; cannot increase available copies.');
            }

            const returnDate = todayDateOnly();
            const fine = overdueDays(loan.dueDate, returnDate);
            await book.update({ availableCopies: book.availableCopies + 1 }, { transaction });
            await loan.update({
                returnDate,
                status: 'DEVOLVIDO',
                fine
            }, { transaction });

            return loan;
        });
    },

    findAll: async (requestedStatus) => {
        const validStatuses = ['ATIVO', 'ATRASADO', 'DEVOLVIDO'];
        if (requestedStatus && !validStatuses.includes(requestedStatus)) {
            throw httpError(400, 'status must be ATIVO, ATRASADO or DEVOLVIDO.');
        }

        await refreshLoanStatuses();
        const loans = await Loan.findAll({
            include: [
                { model: Book, as: 'book', attributes: ['id', 'title', 'isbn'] },
                { model: Reader, as: 'reader', attributes: ['id', 'name', 'cpf'] },
                { model: User, as: 'attendant', attributes: ['id', 'name', 'email'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        const today = todayDateOnly();
        const result = loans.map((loan) => ({
            ...loan.toJSON(),
            status: currentStatus(loan, today)
        }));

        return requestedStatus
            ? result.filter((loan) => loan.status === requestedStatus)
            : result;
    },

    findByReader: async (readerId) => {
        const parsedReaderId = requirePositiveId(readerId, 'readerId');
        const reader = await Reader.findByPk(parsedReaderId);
        if (!reader) throw httpError(404, 'Reader not found.');

        await refreshLoanStatuses({ readerId: parsedReaderId });
        const loans = await Loan.findAll({
            where: { readerId: parsedReaderId },
            include: [{ model: Book, as: 'book', attributes: ['id', 'title', 'isbn'] }],
            order: [['createdAt', 'DESC']]
        });
        const today = todayDateOnly();
        return loans.map((loan) => ({ ...loan.toJSON(), status: currentStatus(loan, today) }));
    }
};

module.exports = loanService;