const db = require('../config/db');
const { DataTypes } = require('sequelize');

const Book = db.define('Book', {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isbn: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    totalCopies: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 }
    },
    availableCopies: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 }
    },
    categoryId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

module.exports = Book;