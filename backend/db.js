const mysql = require("mysql2/promise");

const db = mysql.createPool({
    host: "localhost",
    port: 3306,
    user: "techflow_app",
    password: "TechFlow2026!",
    database: "techflow",
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = db;