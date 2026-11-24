const dotenv = require('dotenv');
dotenv.config();
const db = require('./config/db');
const syncDatabase = require('./config/syncDatabase');
require('./models');
const express = require('express');
const authRouter = require('./auth/auth.router');
const userRouter = require('./user/user.router');
const categoryRouter = require('./category/category.router');
const authorRouter = require('./author/author.router');
const bookRouter = require('./book/book.router');
const readerRouter = require('./reader/reader.router');
const loanRouter = require('./loan/loan.router');
const reportRouter = require('./report/report.router');
const app = express();
const PORT = process.env.PORT || 3000;

const cors = require('cors');
app.use(cors({
    origin: ['http://localhost:3001', 'http://localhost:5173'],
    credentials: true
}));

app.use(express.json());


app.use('/v1/auth', authRouter);
app.use('/v1/user', userRouter);
app.use('/v1/categories', categoryRouter);
app.use('/v1/authors', authorRouter);
app.use('/v1/books', bookRouter);
app.use('/v1/readers', readerRouter);
app.use('/v1/loans', loanRouter);
app.use('/v1/reports', reportRouter);

app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

    const status = error.status || (error.name === 'SequelizeUniqueConstraintError' ? 409 :
        error.name === 'SequelizeValidationError' ? 400 : 500);
    if (status === 500) console.error(error);
    const message = status === 500 ? 'Internal server error.' : error.message;
    return res.status(status).json({ error: message });
});

syncDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`SERVIDOR RODANDO http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Falha ao sincronizar o banco de dados:', error);
        process.exitCode = 1;
    });