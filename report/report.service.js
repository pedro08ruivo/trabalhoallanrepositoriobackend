const { Op } = require('sequelize');
const { Book, Loan } = require('../models');

async function getDashboard() {
    const today = new Date().toISOString().slice(0, 10);
    await Loan.update({ status: 'ATRASADO' }, {
        where: { returnDate: null, dueDate: { [Op.lt]: today } }
    });

    const [totalBooks, activeLoans, overdueLoans, fines] = await Promise.all([
        Book.count(),
        Loan.count({ where: { returnDate: null, status: 'ATIVO' } }),
        Loan.count({ where: { returnDate: null, status: 'ATRASADO' } }),
        Loan.sum('fine', { where: { fine: { [Op.gt]: 0 } } })
    ]);

    return {
        totalBooks,
        activeLoans,
        overdueLoans,
        totalFines: Number(fines || 0)
    };
}

module.exports = { getDashboard };