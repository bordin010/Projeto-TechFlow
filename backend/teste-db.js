const db = require("./db");

async function testarConexao() {
    try {
        const [resultado] = await db.query("SELECT DATABASE() AS banco");
        console.log("Conexão realizada com sucesso!");
        console.log("Banco conectado:", resultado[0].banco);
    } catch (erro) {
        console.error("Erro na conexão:", erro.message);
    } finally {
        await db.end();
    }
}

testarConexao();