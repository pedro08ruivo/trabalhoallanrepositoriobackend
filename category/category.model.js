const db = require('../config/db');
const { DataTypes } = require('sequelize');

const Category = db.define('Category', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

module.exports = Category;