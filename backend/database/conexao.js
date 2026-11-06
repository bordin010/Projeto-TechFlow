// ==========================================
// TECHFLOW - CONEXÃO COM O MYSQL
// ==========================================

const mysql = require("mysql2/promise");

// Configuração da conexão com o MySQL
const conexao = mysql.createPool({

    host: "localhost",

    user: "root",

    password: process.env.DB_PASSWORD,

    database: "techflow",

    // Utilizar UTF-8 para preservar acentos
    // e caracteres especiais
    charset: "utf8mb4",

    // Configurações do pool de conexões
    waitForConnections: true,

    connectionLimit: 10

});

module.exports = conexao;