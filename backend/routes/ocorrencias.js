// ==============================================
// TECHFLOW - ROTAS DE OCORRÊNCIAS
// ==============================================

const express = require("express");
const conexao = require("../database/conexao");

const router = express.Router();

// ==============================================
// VALIDAÇÕES
// ==============================================

const idValido = (id) => /^[1-9]\d*$/.test(String(id));

function acessoNegado(res) {
    return res.status(403).json({
        mensagem: "Você não tem permissão para acessar esta OS."
    });
}

function podeConsultarOS(os, usuario) {
    return usuario.perfil === "administrador" ||
        (
            usuario.perfil === "tecnico" &&
            Number(os.idTecnico) === Number(usuario.idUsuario)
        ) ||
        (
            usuario.perfil === "cliente" &&
            Number(os.idCliente) === Number(usuario.idUsuario)
        );
}

// ==============================================
// POST /api/ocorrencias
// REGISTRAR UMA NOVA OCORRÊNCIA
// ==============================================

router.post("/", async (req, res) => {

    const { idOS, descricao } = req.body || {};

    // Somente técnicos registram ocorrências
    if (req.usuario.perfil !== "tecnico") {
        return res.status(403).json({
            mensagem: "Somente técnicos podem registrar ocorrências."
        });
    }

    if (!idValido(idOS)) {
        return res.status(400).json({
            mensagem: "Informe uma Ordem de Serviço válida."
        });
    }

    if (
        typeof descricao !== "string" ||
        !descricao.trim()
    ) {
        return res.status(400).json({
            mensagem: "Informe a descrição da ocorrência."
        });
    }

    const descricaoLimpa = descricao.trim();

    if (descricaoLimpa.length > 800) {
        return res.status(400).json({
            mensagem: "A ocorrência deve ter no máximo 800 caracteres."
        });
    }

    let db;

    try {

        db = await conexao.getConnection();

        await db.beginTransaction();

        // Bloquear a OS durante a verificação
        const [ordens] = await db.execute(
            `SELECT
                idOS,
                idTecnico,
                statusOS
             FROM OrdensServico
             WHERE idOS = ?
             FOR UPDATE`,
            [idOS]
        );

        if (ordens.length === 0) {

            await db.rollback();

            return res.status(404).json({
                mensagem: "Ordem de Serviço não encontrada."
            });
        }

        const os = ordens[0];

        // Verificar se a OS pertence ao técnico
        if (
            Number(os.idTecnico) !==
            Number(req.usuario.idUsuario)
        ) {

            await db.rollback();

            return acessoNegado(res);
        }

        // Impedir ocorrências em serviços finalizados
        if (
            ["Concluída", "Cancelada"].includes(os.statusOS)
        ) {

            await db.rollback();

            return res.status(400).json({
                mensagem: "Não é permitido registrar ocorrências em uma OS finalizada."
            });
        }

        // Registrar ocorrência no MySQL
        const [resultado] = await db.execute(
            `INSERT INTO OcorrenciasOS
                (idOS, idTecnico, descricao)
             VALUES (?, ?, ?)`,
            [
                idOS,
                req.usuario.idUsuario,
                descricaoLimpa
            ]
        );

        await db.commit();

        return res.status(201).json({
            mensagem: "Ocorrência registrada com sucesso!",
            idOcorrencia: resultado.insertId,
            idOS: Number(idOS)
        });

    } catch (erro) {

        if (db) {
            try {
                await db.rollback();
            } catch (erroRollback) {
                console.error(erroRollback.message);
            }
        }

        console.error("Erro ao registrar ocorrência:", erro.message);

        return res.status(500).json({
            mensagem: "Erro ao registrar ocorrência."
        });

    } finally {

        if (db) {
            db.release();
        }
    }
});

// ==============================================
// GET /api/ocorrencias/:idOS
// CONSULTAR OCORRÊNCIAS DA OS
// ==============================================

router.get("/:idOS", async (req, res) => {

    const { idOS } = req.params;

    if (!idValido(idOS)) {
        return res.status(400).json({
            mensagem: "ID da Ordem de Serviço inválido."
        });
    }

    try {

        // Verificar a existência e a propriedade da OS
        const [ordens] = await conexao.execute(
            `SELECT
                idOS,
                idCliente,
                idTecnico
             FROM OrdensServico
             WHERE idOS = ?`,
            [idOS]
        );

        if (ordens.length === 0) {
            return res.status(404).json({
                mensagem: "Ordem de Serviço não encontrada."
            });
        }

        if (!podeConsultarOS(ordens[0], req.usuario)) {
            return acessoNegado(res);
        }

        // Consultar ocorrências com nome do técnico
        const [ocorrencias] = await conexao.execute(
            `SELECT
                ocorrencia.idOcorrencia,
                ocorrencia.idOS,
                ocorrencia.idTecnico,
                tecnico.nomeCompleto AS nomeTecnico,
                ocorrencia.descricao,
                ocorrencia.dataRegistro
             FROM OcorrenciasOS AS ocorrencia
             INNER JOIN Usuarios AS tecnico
                ON tecnico.idUsuario = ocorrencia.idTecnico
             WHERE ocorrencia.idOS = ?
             ORDER BY
                ocorrencia.dataRegistro DESC,
                ocorrencia.idOcorrencia DESC`,
            [idOS]
        );

        return res.json(ocorrencias);

    } catch (erro) {

        console.error("Erro ao consultar ocorrências:", erro.message);

        return res.status(500).json({
            mensagem: "Erro ao consultar ocorrências."
        });
    }
});

module.exports = router;