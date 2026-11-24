const User = require('../user/user.model');
const Category = require('../category/category.model');
const Author = require('../author/author.model');
const Book = require('../book/book.model');
const BookAuthor = require('../book/bookAuthor.model');
const Reader = require('../reader/reader.model');
const Loan = require('../loan/loan.model');
const RefreshToken = require('../auth/refreshToken.model');
const LogoutList = require('../auth/logoutList.model');

Category.hasMany(Book, {
    as: 'books',
    foreignKey: 'categoryId',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
});
Book.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' });

Book.belongsToMany(Author, {
    as: 'authors',
    through: BookAuthor,
    foreignKey: 'bookId',
    otherKey: 'authorId',
    onDelete: 'CASCADE'
});
Author.belongsToMany(Book, {
    as: 'books',
    through: BookAuthor,
    foreignKey: 'authorId',
    otherKey: 'bookId',
    onDelete: 'CASCADE'
});

Book.hasMany(Loan, {
    as: 'loans',
    foreignKey: 'bookId',
    onDelete: 'RESTRICT'
});
Loan.belongsTo(Book, { as: 'book', foreignKey: 'bookId' });

Reader.hasMany(Loan, {
    as: 'loans',
    foreignKey: 'readerId',
    onDelete: 'RESTRICT'
});
Loan.belongsTo(Reader, { as: 'reader', foreignKey: 'readerId' });

User.hasMany(Loan, {
    as: 'loans',
    foreignKey: 'userId',
    onDelete: 'RESTRICT'
});
Loan.belongsTo(User, { as: 'attendant', foreignKey: 'userId' });

User.hasMany(RefreshToken, {
    as: 'refreshTokens',
    foreignKey: 'userId',
    onDelete: 'CASCADE'
});
RefreshToken.belongsTo(User, { as: 'user', foreignKey: 'userId' });

module.exports = {
    User,
    Category,
    Author,
    Book,
    BookAuthor,
    Reader,
    Loan,
    RefreshToken,
    LogoutList
};