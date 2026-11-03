const express = require("express");
const conexao = require("../database/conexao");

const verificarToken = require("../middlewares/verificarToken");

const router = express.Router();

// Todas as consultas exigem autenticação
router.use(verificarToken);

// CONSULTAR HISTÓRICO DE STATUS DE UMA OS
router.get("/:id/historico", async (req, res) => {
    const { id } = req.params;
    const usuario = req.usuario;

    // Validar ID
    if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({
            mensagem: "ID da OS inválido."
        });
    }

    try {
        // Verificar se a OS existe e quem pode acessá-la
        const [ordens] = await conexao.execute(
            `SELECT idOS, idCliente, idTecnico
             FROM OrdensServico
             WHERE idOS = ?`,
            [id]
        );

        if (ordens.length === 0) {
            return res.status(404).json({
                mensagem: "Ordem de Serviço não encontrada."
            });
        }

        const os = ordens[0];

        const permitido =
            usuario.perfil === "administrador" ||
            (
                usuario.perfil === "cliente" &&
                Number(os.idCliente) === Number(usuario.idUsuario)
            ) ||
            (
                usuario.perfil === "tecnico" &&
                os.idTecnico !== null &&
                Number(os.idTecnico) === Number(usuario.idUsuario)
            );

        if (!permitido) {
            return res.status(403).json({
                mensagem: "Você não tem permissão para consultar o histórico desta OS."
            });
        }

        // Buscar histórico de status
        const [historico] = await conexao.execute(
            `SELECT idHistorico, idOS, statusAnterior,
                    statusNovo, dataAlteracao
             FROM HistoricoStatus
             WHERE idOS = ?
             ORDER BY dataAlteracao ASC, idHistorico ASC`,
            [id]
        );

        res.json(historico);

    } catch (erro) {
        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao consultar histórico da Ordem de Serviço."
        });
    }
});

module.exports = router;