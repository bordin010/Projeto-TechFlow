const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { rateLimit } = require("express-rate-limit");

const conexao = require("../database/conexao");

const router = express.Router();

// ======================================
// LIMITAR REQUISIÇÕES DE LOGIN POR IP
// ======================================

const limitarLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        mensagem: "Muitas tentativas de login. Tente novamente em 15 minutos."
    }
});

// ======================================
// LOGIN DE USUÁRIOS
// ======================================

router.post("/login", limitarLogin, async (req, res) => {

    const { email, senha } = req.body || {};

    // Validar campos obrigatórios
    if (
        typeof email !== "string" ||
        !email.trim() ||
        typeof senha !== "string" ||
        !senha
    ) {
        return res.status(400).json({
            mensagem: "Informe o e-mail e a senha."
        });
    }

    // Verificar configuração do JWT
    if (
        !process.env.JWT_SECRET ||
        process.env.JWT_SECRET.length < 32
    ) {
        return res.status(500).json({
            mensagem: "Autenticação não configurada."
        });
    }

    let db;

    try {

        db = await conexao.getConnection();
        await db.beginTransaction();

        // Buscar usuário pelo e-mail
        const [usuarios] = await db.execute(
            `SELECT idUsuario, nomeCompleto, email, senha,
                    perfil, ativo, tentativasLogin, bloqueadoAte
             FROM Usuarios
             WHERE email = ?
             FOR UPDATE`,
            [email.trim().toLowerCase()]
        );

        // Usuário não encontrado
        if (usuarios.length === 0) {

            await db.rollback();

            return res.status(401).json({
                mensagem: "E-mail ou senha incorretos."
            });
        }

        const usuario = usuarios[0];

        // Verificar se a conta está ativa
        if (!usuario.ativo) {

            await db.rollback();

            return res.status(403).json({
                mensagem: "Conta desativada."
            });
        }

        // Verificar bloqueio temporário
        const agora = new Date();

        const bloqueadoAte = usuario.bloqueadoAte
            ? new Date(usuario.bloqueadoAte)
            : null;

        if (bloqueadoAte && bloqueadoAte > agora) {

            await db.rollback();

            return res.status(423).json({
                mensagem: "Conta bloqueada temporariamente. Tente novamente em 15 minutos."
            });
        }

        // Comparar senha com BCrypt
        const senhaCorreta = await bcrypt.compare(
            senha,
            usuario.senha
        );

        // Tratar senha incorreta
        if (!senhaCorreta) {

            const tentativas = bloqueadoAte
                ? 1
                : usuario.tentativasLogin + 1;

            if (tentativas >= 5) {

                await db.execute(
                    `UPDATE Usuarios
                     SET tentativasLogin = 5,
                         bloqueadoAte = DATE_ADD(
                             NOW(),
                             INTERVAL 15 MINUTE
                         )
                     WHERE idUsuario = ?`,
                    [usuario.idUsuario]
                );

                await db.commit();

                return res.status(423).json({
                    mensagem: "Conta bloqueada por 15 minutos."
                });
            }

            await db.execute(
                `UPDATE Usuarios
                 SET tentativasLogin = ?,
                     bloqueadoAte = NULL
                 WHERE idUsuario = ?`,
                [tentativas, usuario.idUsuario]
            );

            await db.commit();

            return res.status(401).json({
                mensagem: "E-mail ou senha incorretos."
            });
        }

        // Login correto: zerar tentativas
        await db.execute(
            `UPDATE Usuarios
             SET tentativasLogin = 0,
                 bloqueadoAte = NULL
             WHERE idUsuario = ?`,
            [usuario.idUsuario]
        );

        await db.commit();

        // Gerar token JWT
        const token = jwt.sign(
            {
                idUsuario: usuario.idUsuario,
                perfil: usuario.perfil
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        // Retornar dados sem a senha
        return res.json({
            mensagem: "Login realizado com sucesso!",
            token,
            usuario: {
                idUsuario: usuario.idUsuario,
                nomeCompleto: usuario.nomeCompleto,
                email: usuario.email,
                perfil: usuario.perfil
            }
        });

    } catch (erro) {

        if (db) {
            try {
                await db.rollback();
            } catch (erroRollback) {
                console.error(erroRollback.message);
            }
        }

        console.error(erro.message);

        return res.status(500).json({
            mensagem: "Erro ao realizar login."
        });

    } finally {

        if (db) {
            db.release();
        }
    }
});

// ======================================
// CONSULTAR PERFIL AUTENTICADO
// GET /api/auth/perfil
// ======================================

router.get("/perfil", async (req, res) => {

    try {

        // Recuperar token do cabeçalho Authorization
        const autorizacao = req.headers.authorization || "";

        const partes = autorizacao.split(" ");

        if (
            partes.length !== 2 ||
            partes[0] !== "Bearer" ||
            !partes[1]
        ) {
            return res.status(401).json({
                mensagem: "Token de autenticação não informado."
            });
        }

        // Verificar se o servidor possui uma chave válida
        if (
            !process.env.JWT_SECRET ||
            process.env.JWT_SECRET.length < 32
        ) {
            return res.status(500).json({
                mensagem: "Autenticação não configurada."
            });
        }

        let usuarioToken;

        try {

            usuarioToken = jwt.verify(
                partes[1],
                process.env.JWT_SECRET,
                {
                    algorithms: ["HS256"]
                }
            );

        } catch (erroToken) {

            return res.status(401).json({
                mensagem: "Sessão inválida ou expirada. Faça login novamente."
            });
        }

        // Validar o ID recebido do token
        const idUsuario = usuarioToken.idUsuario;

        if (
            !Number.isSafeInteger(Number(idUsuario)) ||
            Number(idUsuario) <= 0
        ) {
            return res.status(401).json({
                mensagem: "Token de autenticação inválido."
            });
        }

        // Consultar apenas o usuário do token
        const [usuarios] = await conexao.execute(
            `SELECT
                idUsuario,
                nomeCompleto,
                email,
                telefone,
                endereco,
                perfil,
                ativo
             FROM Usuarios
             WHERE idUsuario = ?
               AND perfil = ?
             LIMIT 1`,
            [idUsuario, usuarioToken.perfil]
        );

        if (usuarios.length === 0) {

            return res.status(404).json({
                mensagem: "Perfil não encontrado."
            });
        }

        const usuario = usuarios[0];

        // Impedir consulta de conta desativada
        if (!usuario.ativo) {

            return res.status(403).json({
                mensagem: "Conta desativada."
            });
        }

        // Retornar apenas os dados permitidos
        return res.json({
            usuario: {
                idUsuario: usuario.idUsuario,
                nomeCompleto: usuario.nomeCompleto,
                email: usuario.email,
                telefone: usuario.telefone,
                endereco: usuario.endereco,
                perfil: usuario.perfil,
                ativo: Boolean(usuario.ativo)
            }
        });

    } catch (erro) {

        console.error("Erro ao consultar perfil:", erro.message);

        return res.status(500).json({
            mensagem: "Erro ao consultar perfil do usuário."
        });
    }
});

module.exports = router;