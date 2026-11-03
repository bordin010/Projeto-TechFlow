const mysql = require("mysql2/promise");

// Configuração da conexão com o MySQL
const conexao = mysql.createPool({
    host: "localhost",
    user: "root",
    password: process.env.DB_PASSWORD,
    database: "techflow",
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = conexao;