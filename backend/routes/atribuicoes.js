const express = require("express");
const router = express.Router();

const conexao = require("../database/conexao");
const verificarToken = require("../middlewares/verificarToken");
const verificarPerfil = require("../middlewares/verificarPerfil");

// ATRIBUIR UM TÉCNICO A UMA ORDEM DE SERVIÇO
router.patch(
    "/:id/atribuir",
    verificarToken,
    verificarPerfil("administrador"),
    async (req, res) => {
    const { id } = req.params;
    const { idTecnico } = req.body || {};

    // Validar os IDs
    if (
        !/^[1-9]\d*$/.test(String(id)) ||
        !Number.isSafeInteger(Number(id)) ||
        !/^[1-9]\d*$/.test(String(idTecnico)) ||
        !Number.isSafeInteger(Number(idTecnico))
    ) {
        return res.status(400).json({
            mensagem: "Informe IDs válidos para a OS e o técnico."
        });
    }

    let db;

    try {
        db = await conexao.getConnection();
        await db.beginTransaction();

        // Verificar se o técnico existe e está ativo
        const [tecnicos] = await db.execute(
            `SELECT idUsuario
             FROM Usuarios
             WHERE idUsuario = ?
               AND perfil = 'tecnico'
               AND ativo = 1`,
            [idTecnico]
        );

        if (tecnicos.length === 0) {
            await db.rollback();

            return res.status(400).json({
                mensagem: "Técnico não encontrado ou inativo."
            });
        }

        // Buscar e bloquear a OS durante a atribuição
        const [ordens] = await db.execute(
            `SELECT idOS, idTecnico, statusOS
             FROM OrdensServico
             WHERE idOS = ?
             FOR UPDATE`,
            [id]
        );

        if (ordens.length === 0) {
            await db.rollback();

            return res.status(404).json({
                mensagem: "Ordem de Serviço não encontrada."
            });
        }

        const os = ordens[0];

        // Não atribuir técnicos a ordens finalizadas
        if (["Concluída", "Cancelada"].includes(os.statusOS)) {
            await db.rollback();

            return res.status(400).json({
                mensagem: "Não é possível atribuir técnico a uma OS finalizada."
            });
        }

        // Evitar atribuição repetida
        if (Number(os.idTecnico) === Number(idTecnico)) {
            await db.rollback();

            return res.status(400).json({
                mensagem: "Este técnico já está atribuído à OS."
            });
        }

        // Atualizar técnico responsável
        await db.execute(
            `UPDATE OrdensServico
             SET idTecnico = ?
             WHERE idOS = ?`,
            [idTecnico, id]
        );

        // Registrar no histórico de atribuições
        await db.execute(
            `INSERT INTO HistoricoAtribuicoes
             (idOS, idTecnico)
             VALUES (?, ?)`,
            [id, idTecnico]
        );

        await db.commit();

        return res.json({
            mensagem: "Técnico atribuído com sucesso!",
            idOS: Number(id),
            idTecnico: Number(idTecnico)
        });

    } catch (erro) {
        if (db) {
            await db.rollback();
        }

        console.error(erro.message);

        return res.status(500).json({
            mensagem: "Erro ao atribuir técnico à Ordem de Serviço."
        });

    } finally {
        if (db) {
            db.release();
        }
    }
});

module.exports = router;