const db = require('../config/db');
const { DataTypes } = require('sequelize');

const Loan = db.define('Loan', {
    loanDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    returnDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'ATIVO',
        validate: { isIn: [['ATIVO', 'DEVOLVIDO', 'ATRASADO']] }
    },
    fine: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 }
    },
    bookId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    readerId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

module.exports = Loan;