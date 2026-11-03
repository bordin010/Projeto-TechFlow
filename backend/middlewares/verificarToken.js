const jwt = require("jsonwebtoken");
const conexao = require("../database/conexao");

async function verificarToken(req, res, next) {
    const autorizacao = req.headers.authorization;

    if (!autorizacao || !autorizacao.startsWith("Bearer ")) {
        return res.status(401).json({
            mensagem: "Token de autenticação não informado."
        });
    }

    const token = autorizacao.split(" ")[1];

    try {
        const dados = jwt.verify(token, process.env.JWT_SECRET);

        // Verificar se o usuário ainda está ativo
        const [usuarios] = await conexao.execute(
            `SELECT idUsuario, perfil, ativo
             FROM Usuarios
             WHERE idUsuario = ?`,
            [dados.idUsuario]
        );

        if (usuarios.length === 0 || !usuarios[0].ativo) {
            return res.status(403).json({
                mensagem: "Usuário inexistente ou desativado."
            });
        }

        // Disponibilizar os dados do usuário nas próximas rotas
        req.usuario = {
            idUsuario: usuarios[0].idUsuario,
            perfil: usuarios[0].perfil
        };

        next();

    } catch (erro) {
        if (erro.name === "TokenExpiredError") {
            return res.status(401).json({
                mensagem: "Token expirado. Faça login novamente."
            });
        }

        if (erro.name === "JsonWebTokenError" ||
            erro.name === "NotBeforeError") {
            return res.status(401).json({
                mensagem: "Token inválido."
            });
        }

        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao verificar autenticação."
        });
    }
}

module.exports = verificarToken;