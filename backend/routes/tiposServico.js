const express = require("express");
const conexao = require("../database/conexao");

const verificarPerfil = require("../middlewares/verificarPerfil");
const { idValido } = require("../utils/validacoes");

const router = express.Router();

// Somente administradores podem modificar tipos de serviço
const somenteAdmin = verificarPerfil("administrador");

// VALIDAR DADOS DO TIPO DE SERVIÇO
function dadosValidos(dados) {
    return (
        typeof dados.nomeServico === "string" &&
        dados.nomeServico.trim().length > 0 &&
        (
            dados.descricao == null ||
            typeof dados.descricao === "string"
        )
    );
}

// LISTAR TIPOS DE SERVIÇO
router.get("/", async (req, res) => {
    try {
        let sql = `
            SELECT idTipoServico, nomeServico, descricao, ativo
            FROM TiposServico
        `;

        if (req.usuario.perfil === "cliente") {
            sql += " WHERE ativo = 1";
        } else if (req.usuario.perfil !== "administrador") {
            return res.status(403).json({
                mensagem: "Você não tem permissão para acessar tipos de serviço."
            });
        }

        sql += " ORDER BY nomeServico";

        const [servicos] = await conexao.query(sql);

        res.json(servicos);

    } catch (erro) {
        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao listar tipos de serviço."
        });
    }
});

// CONSULTAR TIPO DE SERVIÇO PELO ID
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID do tipo de serviço inválido."
            });
        }

        if (!["cliente", "administrador"].includes(req.usuario.perfil)) {
            return res.status(403).json({
                mensagem: "Você não tem permissão para acessar tipos de serviço."
            });
        }

        let sql = `
            SELECT idTipoServico, nomeServico, descricao, ativo
            FROM TiposServico
            WHERE idTipoServico = ?
        `;

        if (req.usuario.perfil === "cliente") {
            sql += " AND ativo = 1";
        }

        const [servicos] = await conexao.execute(sql, [id]);

        if (servicos.length === 0) {
            return res.status(404).json({
                mensagem: "Tipo de serviço não encontrado."
            });
        }

        res.json(servicos[0]);

    } catch (erro) {
        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao consultar tipo de serviço."
        });
    }
});

// CADASTRAR TIPO DE SERVIÇO
router.post("/", somenteAdmin, async (req, res) => {
    try {
        const dados = req.body || {};

        if (!dadosValidos(dados)) {
            return res.status(400).json({
                mensagem: "Informe um nome válido para o serviço."
            });
        }

        const [resultado] = await conexao.execute(
            `INSERT INTO TiposServico
             (nomeServico, descricao, ativo)
             VALUES (?, ?, 1)`,
            [
                dados.nomeServico.trim(),
                dados.descricao?.trim() || null
            ]
        );

        res.status(201).json({
            mensagem: "Tipo de serviço cadastrado com sucesso!",
            idTipoServico: resultado.insertId
        });

    } catch (erro) {
        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensagem: "Já existe um tipo de serviço com esse nome."
            });
        }

        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao cadastrar tipo de serviço."
        });
    }
});

// ATUALIZAR TIPO DE SERVIÇO
router.put("/:id", somenteAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const dados = req.body || {};

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID do tipo de serviço inválido."
            });
        }

        if (!dadosValidos(dados)) {
            return res.status(400).json({
                mensagem: "Informe dados válidos para o serviço."
            });
        }

        const [resultado] = await conexao.execute(
            `UPDATE TiposServico
             SET nomeServico = ?, descricao = ?
             WHERE idTipoServico = ?`,
            [
                dados.nomeServico.trim(),
                dados.descricao?.trim() || null,
                id
            ]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensagem: "Tipo de serviço não encontrado."
            });
        }

        res.json({
            mensagem: "Tipo de serviço atualizado com sucesso!"
        });

    } catch (erro) {
        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensagem: "Já existe um tipo de serviço com esse nome."
            });
        }

        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao atualizar tipo de serviço."
        });
    }
});

// DESATIVAR TIPO DE SERVIÇO
router.patch("/:id/desativar", somenteAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID do tipo de serviço inválido."
            });
        }

        const [resultado] = await conexao.execute(
            `UPDATE TiposServico
             SET ativo = 0
             WHERE idTipoServico = ?`,
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensagem: "Tipo de serviço não encontrado."
            });
        }

        res.json({
            mensagem: "Tipo de serviço desativado com sucesso!"
        });

    } catch (erro) {
        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao desativar tipo de serviço."
        });
    }
});

// REATIVAR TIPO DE SERVIÇO
router.patch("/:id/reativar", somenteAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID do tipo de serviço inválido."
            });
        }

        const [resultado] = await conexao.execute(
            `UPDATE TiposServico
             SET ativo = 1
             WHERE idTipoServico = ?`,
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensagem: "Tipo de serviço não encontrado."
            });
        }

        res.json({
            mensagem: "Tipo de serviço reativado com sucesso!"
        });

    } catch (erro) {
        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao reativar tipo de serviço."
        });
    }
});

module.exports = router;