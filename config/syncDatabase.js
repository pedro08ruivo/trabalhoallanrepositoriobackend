const bcrypt = require('bcrypt');
const db = require('./db');
const { User, Category, Author, Book, Reader, Loan } = require('../models');

async function syncDatabase() {
    await db.sync();

    const userColumns = await db.getQueryInterface().describeTable(User.getTableName());
    if (!userColumns.active) {
        await db.getQueryInterface().addColumn(User.getTableName(), 'active', {
            type: User.rawAttributes.active.type,
            allowNull: false,
            defaultValue: true
        });
    }

    if (await User.count() === 0) {
        const name = process.env.ADMIN_NAME || 'Administrador';
        const username = process.env.ADMIN_USERNAME || 'admin';
        const email = process.env.ADMIN_EMAIL || 'admin@biblioteca.com';
        const password = process.env.ADMIN_PASSWORD || '123456';

        await User.create({
            name,
            username,
            email,
            password: await bcrypt.hash(password, 10),
            isAdmin: true,
            active: true
        });
        console.log(`Seed do administrador criado: ${email}`);
    }

    await seedLibrary();
}

async function seedLibrary() {
    // Remove somente os registros legados usados pelo seed anterior.
    const legacyReaderCpfs = ['12345678900', '98765432100'];
    const legacyReaders = await Reader.findAll({ where: { cpf: legacyReaderCpfs } });
    if (legacyReaders.length) {
        await Loan.destroy({ where: { readerId: legacyReaders.map((reader) => reader.id) } });
        await Reader.destroy({ where: { cpf: legacyReaderCpfs } });
    }

    const legacyIsbns = ['978-8535910663', '978-8535909889'];
    const legacyBooks = await Book.findAll({ where: { isbn: legacyIsbns } });
    if (legacyBooks.length) {
        await Loan.destroy({ where: { bookId: legacyBooks.map((book) => book.id) } });
        await db.getQueryInterface().bulkDelete('BookAuthors', { bookId: legacyBooks.map((book) => book.id) });
        await Book.destroy({ where: { isbn: legacyIsbns } });
    }

    const categoryNames = [
        ['Ficção', 'Romances, contos e narrativas'],
        ['Ciência', 'Conhecimento científico e técnico'],
        ['História', 'História geral e brasileira'],
        ['Tecnologia', 'Programação, dados e sistemas'],
        ['Biografias', 'Histórias de vidas reais'],
        ['Poesia', 'Poemas e literatura em versos'],
        ['Infantil', 'Leitura para crianças'],
        ['Fantasia', 'Universos mágicos e imaginários'],
        ['Autoajuda', 'Desenvolvimento pessoal'],
        ['Direito', 'Direito, leis e jurisprudência']
    ];

    const categories = [];
    for (const [name, description] of categoryNames) {
        const [category] = await Category.findOrCreate({
            where: { name },
            defaults: { description }
        });
        categories.push(category);
    }

    const authorSeeds = [
        ['Machado de Assis', 'Brasileira', '1839-06-21'],
        ['Carl Sagan', 'Americana', '1934-11-09'],
        ['Clarice Lispector', 'Brasileira', '1920-12-10'],
        ['Guimarães Rosa', 'Brasileira', '1908-06-27'],
        ['George Orwell', 'Britânica', '1903-06-25'],
        ['J. R. R. Tolkien', 'Britânica', '1892-01-03'],
        ['Jane Austen', 'Britânica', '1775-12-16'],
        ['Gabriel García Márquez', 'Colombiana', '1927-03-06'],
        ['Isaac Asimov', 'Americana', '1920-01-02'],
        ['Marie Curie', 'Polonesa', '1867-11-07'],
        ['Nelson Mandela', 'Sul-africana', '1918-07-18'],
        ['Paulo Freire', 'Brasileira', '1921-09-19'],
        ['Cecília Meireles', 'Brasileira', '1901-11-07'],
        ['Stephen Hawking', 'Britânica', '1942-01-08'],
        ['Ruth Rocha', 'Brasileira', '1931-03-02']
    ];

    const authors = [];
    for (const [name, nationality, birthDate] of authorSeeds) {
        const [author] = await Author.findOrCreate({
            where: { name },
            defaults: { nationality, birthDate }
        });
        authors.push(author);
    }

    const books = [];
    const categoryPrefixes = ['FIC', 'CIE', 'HIS', 'TEC', 'BIO', 'POE', 'INF', 'FAN', 'AUTO', 'DIR'];

    for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex += 1) {
        for (let bookIndex = 1; bookIndex <= 10; bookIndex += 1) {
            const category = categories[categoryIndex];
            const prefix = categoryPrefixes[categoryIndex];
            const title = `${category.name} — Volume ${bookIndex}`;
            const isbn = `978-SEED-${prefix}-${String(bookIndex).padStart(2, '0')}`;

            let [book] = await Book.findOrCreate({
                where: { isbn },
                defaults: {
                    title,
                    isbn,
                    year: 1980 + ((categoryIndex * 10 + bookIndex) % 46),
                    totalCopies: 3,
                    availableCopies: 3,
                    categoryId: category.id
                }
            });

            // Atualiza nome/categoria se o registro já existir.
            await book.update({ title, year: book.year || 1980, categoryId: category.id });
            await book.setAuthors([
                authors[(categoryIndex + bookIndex - 1) % 14].id,
                authors[(categoryIndex + bookIndex) % 14].id
            ]);
            books.push(book);
        }
    }

    const admin = await User.findOne({
        where: { isAdmin: true, active: true },
        order: [['id', 'ASC']]
    });

    const readers = [];
    for (let index = 1; index <= 30; index += 1) {
        const cpf = `DEMO${String(index).padStart(8, '0')}`;
        const [reader] = await Reader.findOrCreate({
            where: { cpf },
            defaults: {
                name: `Leitor Demonstração ${String(index).padStart(2, '0')}`,
                cpf,
                email: `leitor${String(index).padStart(2, '0')}@biblioteca.demo`,
                phone: `(44) 99999-${String(1000 + index).padStart(4, '0')}`
            }
        });
        readers.push(reader);
    }

    if (admin) {
        // Dez leitores: cinco atrasados com R$ 50,00 e cinco já devolvidos/pagos com R$ 50,00.
        for (let index = 0; index < 5; index += 1) {
            const reader = readers[index];
            const book = books[index];
            const loanExists = await Loan.findOne({
                where: { readerId: reader.id, bookId: book.id, returnDate: null }
            });

            if (!loanExists) {
                await Loan.create({
                    loanDate: '2026-10-20',
                    dueDate: '2026-10-27',
                    returnDate: null,
                    status: 'ATRASADO',
                    fine: 50,
                    bookId: book.id,
                    readerId: reader.id,
                    userId: admin.id
                });
                await book.update({ availableCopies: Math.max(0, book.availableCopies - 1) });
            }
        }

        for (let index = 5; index < 10; index += 1) {
            const reader = readers[index];
            const book = books[index];
            const loanExists = await Loan.findOne({
                where: { readerId: reader.id, bookId: book.id, status: 'DEVOLVIDO' }
            });

            if (!loanExists) {
                await Loan.create({
                    loanDate: '2026-10-01',
                    dueDate: '2026-10-08',
                    returnDate: '2026-10-16',
                    status: 'DEVOLVIDO',
                    fine: 50,
                    bookId: book.id,
                    readerId: reader.id,
                    userId: admin.id
                });
            }
        }

        // Os 20 restantes ficam sem atrasos e sem multas: dez sem empréstimo e dez devolvidos sem multa.
        for (let index = 10; index < 20; index += 1) {
            // Leitores sem histórico podem ser excluídos diretamente.
            continue;
        }

        for (let index = 20; index < 30; index += 1) {
            const reader = readers[index];
            const book = books[index];
            const loanExists = await Loan.findOne({
                where: { readerId: reader.id, bookId: book.id }
            });

            if (!loanExists) {
                await Loan.create({
                    loanDate: '2026-11-10',
                    dueDate: '2026-11-17',
                    returnDate: '2026-11-12',
                    status: 'DEVOLVIDO',
                    fine: 0,
                    bookId: book.id,
                    readerId: reader.id,
                    userId: admin.id
                });
            }
        }
    }

    console.log(`Dados de demonstração sincronizados: ${categories.length} categorias, ${books.length} livros, ${authors.length} autores e ${readers.length} leitores.`);
}

module.exports = syncDatabase;