const db = require('../config/db');
const { DataTypes } = require('sequelize');

const BookAuthor = db.define('BookAuthor', {
    bookId: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    authorId: {
        type: DataTypes.INTEGER,
        primaryKey: true
    }
}, {
    timestamps: false
});

module.exports = BookAuthor;