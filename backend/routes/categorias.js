const express = require("express");
const conexao = require("../database/conexao");

const verificarPerfil = require("../middlewares/verificarPerfil");

const router = express.Router();

const { idValido } = require("../utils/validacoes");

// SOMENTE ADMINISTRADORES PODEM MODIFICAR CATEGORIAS
const somenteAdmin = verificarPerfil("administrador");

// VALIDAR DADOS DA CATEGORIA
function dadosValidos(dados) {
    return (
        typeof dados.nomeCategoria === "string" &&
        dados.nomeCategoria.trim().length > 0 &&
        (
            dados.descricao == null ||
            typeof dados.descricao === "string"
        )
    );
}

// LISTAR CATEGORIAS
router.get("/", async (req, res) => {
    try {
        let sql = `
            SELECT idCategoria, nomeCategoria, descricao, ativo
            FROM Categorias
        `;

        // Clientes visualizam somente categorias ativas
        if (req.usuario.perfil === "cliente") {
            sql += " WHERE ativo = 1";
        } else if (req.usuario.perfil !== "administrador") {
            return res.status(403).json({
                mensagem: "Você não tem permissão para acessar categorias."
            });
        }

        sql += " ORDER BY nomeCategoria";

        const [categorias] = await conexao.query(sql);

        res.json(categorias);

    } catch (erro) {
        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao listar categorias."
        });
    }
});

// CONSULTAR CATEGORIA PELO ID
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID da categoria inválido."
            });
        }

        if (
            !["administrador", "cliente"].includes(req.usuario.perfil)
        ) {
            return res.status(403).json({
                mensagem: "Você não tem permissão para acessar categorias."
            });
        }

        let sql = `
            SELECT idCategoria, nomeCategoria, descricao, ativo
            FROM Categorias
            WHERE idCategoria = ?
        `;

        if (req.usuario.perfil === "cliente") {
            sql += " AND ativo = 1";
        }

        const [categorias] = await conexao.execute(sql, [id]);

        if (categorias.length === 0) {
            return res.status(404).json({
                mensagem: "Categoria não encontrada."
            });
        }

        res.json(categorias[0]);

    } catch (erro) {
        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao consultar categoria."
        });
    }
});

// CADASTRAR CATEGORIA
router.post("/", somenteAdmin, async (req, res) => {
    try {
        const dados = req.body || {};

        if (!dadosValidos(dados)) {
            return res.status(400).json({
                mensagem: "Informe um nome válido para a categoria."
            });
        }

        const [resultado] = await conexao.execute(
            `INSERT INTO Categorias
             (nomeCategoria, descricao, ativo)
             VALUES (?, ?, 1)`,
            [
                dados.nomeCategoria.trim(),
                dados.descricao?.trim() || null
            ]
        );

        res.status(201).json({
            mensagem: "Categoria cadastrada com sucesso!",
            idCategoria: resultado.insertId
        });

    } catch (erro) {
        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensagem: "Já existe uma categoria com esse nome."
            });
        }

        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao cadastrar categoria."
        });
    }
});

// ATUALIZAR CATEGORIA
router.put("/:id", somenteAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const dados = req.body || {};

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID da categoria inválido."
            });
        }

        if (!dadosValidos(dados)) {
            return res.status(400).json({
                mensagem: "Informe dados válidos para a categoria."
            });
        }

        const [resultado] = await conexao.execute(
            `UPDATE Categorias
             SET nomeCategoria = ?, descricao = ?
             WHERE idCategoria = ?`,
            [
                dados.nomeCategoria.trim(),
                dados.descricao?.trim() || null,
                id
            ]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensagem: "Categoria não encontrada."
            });
        }

        res.json({
            mensagem: "Categoria atualizada com sucesso!"
        });

    } catch (erro) {
        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensagem: "Já existe uma categoria com esse nome."
            });
        }

        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao atualizar categoria."
        });
    }
});

// DESATIVAR CATEGORIA
router.patch("/:id/desativar", somenteAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID da categoria inválido."
            });
        }

        const [resultado] = await conexao.execute(
            `UPDATE Categorias
             SET ativo = 0
             WHERE idCategoria = ?`,
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensagem: "Categoria não encontrada."
            });
        }

        res.json({
            mensagem: "Categoria desativada com sucesso!"
        });

    } catch (erro) {
        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao desativar categoria."
        });
    }
});

// REATIVAR CATEGORIA
router.patch("/:id/reativar", somenteAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID da categoria inválido."
            });
        }

        const [resultado] = await conexao.execute(
            `UPDATE Categorias
             SET ativo = 1
             WHERE idCategoria = ?`,
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensagem: "Categoria não encontrada."
            });
        }

        res.json({
            mensagem: "Categoria reativada com sucesso!"
        });

    } catch (erro) {
        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao reativar categoria."
        });
    }
});

module.exports = router;