const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { rateLimit } = require("express-rate-limit");

const conexao = require("../database/conexao");

const router = express.Router();

// LIMITAR REQUISIÇÕES DE LOGIN POR IP
const limitarLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        mensagem: "Muitas tentativas de login. Tente novamente em 15 minutos."
    }
});

// LOGIN DE USUÁRIOS
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

        // Verificar bloqueio temporário da conta
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

        // Comparar senha informada com o hash BCrypt
        const senhaCorreta = await bcrypt.compare(
            senha,
            usuario.senha
        );

        // Tratar senha incorreta
        if (!senhaCorreta) {
            const tentativas = bloqueadoAte
                ? 1
                : usuario.tentativasLogin + 1;

            // Bloquear após cinco tentativas incorretas
            if (tentativas >= 5) {
                await db.execute(
                    `UPDATE Usuarios
                     SET tentativasLogin = 5,
                         bloqueadoAte = DATE_ADD(NOW(), INTERVAL 15 MINUTE)
                     WHERE idUsuario = ?`,
                    [usuario.idUsuario]
                );

                await db.commit();

                return res.status(423).json({
                    mensagem: "Conta bloqueada por 15 minutos."
                });
            }

            // Registrar tentativa incorreta
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

        // Login correto: zerar contador de tentativas
        await db.execute(
            `UPDATE Usuarios
             SET tentativasLogin = 0,
                 bloqueadoAte = NULL
             WHERE idUsuario = ?`,
            [usuario.idUsuario]
        );

        await db.commit();

        // Gerar token JWT com validade de uma hora
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

        // Retornar informações do usuário sem a senha
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

module.exports = router;