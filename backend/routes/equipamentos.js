const express = require("express");
const conexao = require("../database/conexao");

const router = express.Router();

const { idValido } = require("../utils/validacoes");

// VERIFICAR SE O USUÁRIO PODE ACESSAR O EQUIPAMENTO
function podeAcessar(equipamento, usuario) {
    return usuario.perfil === "administrador" ||
        (
            usuario.perfil === "cliente" &&
            Number(equipamento.idCliente) === Number(usuario.idUsuario)
        );
}

// RESPOSTA DE ACESSO NEGADO
function acessoNegado(res) {
    return res.status(403).json({
        mensagem: "Você não tem permissão para acessar este equipamento."
    });
}

// VALIDAR DADOS DO EQUIPAMENTO
function dadosValidos(dados) {
    return (
        idValido(dados.idCategoria) &&
        typeof dados.nomeEquipamento === "string" &&
        !!dados.nomeEquipamento.trim() &&
        typeof dados.marca === "string" &&
        !!dados.marca.trim() &&
        typeof dados.modelo === "string" &&
        !!dados.modelo.trim()
    );
}

// LISTAR EQUIPAMENTOS
router.get("/", async (req, res) => {
    try {
        const usuario = req.usuario;

        let sql = `
            SELECT idEquipamento, idCliente, idCategoria,
                   nomeEquipamento, marca, modelo,
                   ativo, dataCadastro
            FROM Equipamentos
        `;

        const parametros = [];

        if (usuario.perfil === "cliente") {
            sql += " WHERE idCliente = ?";
            parametros.push(usuario.idUsuario);

        } else if (usuario.perfil !== "administrador") {
            return acessoNegado(res);
        }

        sql += " ORDER BY idEquipamento DESC";

        const [equipamentos] = await conexao.execute(
            sql,
            parametros
        );

        res.json(equipamentos);

    } catch (erro) {
        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao listar equipamentos."
        });
    }
});

// CONSULTAR EQUIPAMENTO PELO ID
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID do equipamento inválido."
            });
        }

        const [equipamentos] = await conexao.execute(
            `SELECT idEquipamento, idCliente, idCategoria,
                    nomeEquipamento, marca, modelo,
                    ativo, dataCadastro
             FROM Equipamentos
             WHERE idEquipamento = ?`,
            [id]
        );

        if (equipamentos.length === 0) {
            return res.status(404).json({
                mensagem: "Equipamento não encontrado."
            });
        }

        const equipamento = equipamentos[0];

        if (!podeAcessar(equipamento, req.usuario)) {
            return acessoNegado(res);
        }

        res.json(equipamento);

    } catch (erro) {
        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao consultar equipamento."
        });
    }
});

// CADASTRAR EQUIPAMENTO
router.post("/", async (req, res) => {
    try {
        const {
            idCliente,
            idCategoria,
            nomeEquipamento,
            marca,
            modelo
        } = req.body || {};

        const usuario = req.usuario;

        // Apenas clientes e administradores podem cadastrar
        if (!["cliente", "administrador"].includes(usuario.perfil)) {
            return acessoNegado(res);
        }

        if (!dadosValidos(req.body || {})) {
            return res.status(400).json({
                mensagem: "Preencha corretamente os dados do equipamento."
            });
        }

        // Cliente sempre cadastra equipamento para si mesmo
        const clienteResponsavel =
            usuario.perfil === "cliente"
                ? usuario.idUsuario
                : idCliente;

        if (!idValido(clienteResponsavel)) {
            return res.status(400).json({
                mensagem: "Cliente inválido."
            });
        }

        // Impedir que um cliente tente cadastrar para outro
        if (
            usuario.perfil === "cliente" &&
            idCliente != null &&
            Number(idCliente) !== Number(usuario.idUsuario)
        ) {
            return acessoNegado(res);
        }

        // Verificar cliente ativo
        const [clientes] = await conexao.execute(
            `SELECT idUsuario
             FROM Usuarios
             WHERE idUsuario = ?
               AND perfil = 'cliente'
               AND ativo = 1`,
            [clienteResponsavel]
        );

        if (clientes.length === 0) {
            return res.status(400).json({
                mensagem: "Cliente não encontrado ou inativo."
            });
        }

        // Verificar categoria ativa
        const [categorias] = await conexao.execute(
            `SELECT idCategoria
             FROM Categorias
             WHERE idCategoria = ?
               AND ativo = 1`,
            [idCategoria]
        );

        if (categorias.length === 0) {
            return res.status(400).json({
                mensagem: "Categoria não encontrada ou inativa."
            });
        }

        // Cadastrar equipamento
        const [resultado] = await conexao.execute(
            `INSERT INTO Equipamentos
             (idCliente, idCategoria, nomeEquipamento,
              marca, modelo, ativo)
             VALUES (?, ?, ?, ?, ?, 1)`,
            [
                clienteResponsavel,
                idCategoria,
                nomeEquipamento.trim(),
                marca.trim(),
                modelo.trim()
            ]
        );

        res.status(201).json({
            mensagem: "Equipamento cadastrado com sucesso!",
            idEquipamento: resultado.insertId
        });

    } catch (erro) {
        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao cadastrar equipamento."
        });
    }
});

// ATUALIZAR EQUIPAMENTO
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const dados = req.body || {};

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID do equipamento inválido."
            });
        }

        if (!["cliente", "administrador"].includes(req.usuario.perfil)) {
            return acessoNegado(res);
        }

        if (!dadosValidos(dados)) {
            return res.status(400).json({
                mensagem: "Informe dados válidos para o equipamento."
            });
        }

        // Verificar existência e propriedade
        const [equipamentos] = await conexao.execute(
            `SELECT idEquipamento, idCliente
             FROM Equipamentos
             WHERE idEquipamento = ?`,
            [id]
        );

        if (equipamentos.length === 0) {
            return res.status(404).json({
                mensagem: "Equipamento não encontrado."
            });
        }

        if (!podeAcessar(equipamentos[0], req.usuario)) {
            return acessoNegado(res);
        }

        // Verificar categoria
        const [categorias] = await conexao.execute(
            `SELECT idCategoria
             FROM Categorias
             WHERE idCategoria = ?
               AND ativo = 1`,
            [dados.idCategoria]
        );

        if (categorias.length === 0) {
            return res.status(400).json({
                mensagem: "Categoria não encontrada ou inativa."
            });
        }

        // Atualizar apenas os campos permitidos
        // A propriedade do equipamento não pode ser transferida aqui
        const [resultado] = await conexao.execute(
            `UPDATE Equipamentos
             SET idCategoria = ?,
                 nomeEquipamento = ?,
                 marca = ?,
                 modelo = ?
             WHERE idEquipamento = ?
               AND idCliente = ?`,
            [
                dados.idCategoria,
                dados.nomeEquipamento.trim(),
                dados.marca.trim(),
                dados.modelo.trim(),
                id,
                equipamentos[0].idCliente
            ]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensagem: "Equipamento não encontrado."
            });
        }

        res.json({
            mensagem: "Equipamento atualizado com sucesso!"
        });

    } catch (erro) {
        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao atualizar equipamento."
        });
    }
});

// DESATIVAR EQUIPAMENTO
router.patch("/:id/desativar", async (req, res) => {
    try {
        const { id } = req.params;

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID do equipamento inválido."
            });
        }

        const [equipamentos] = await conexao.execute(
            `SELECT idCliente
             FROM Equipamentos
             WHERE idEquipamento = ?`,
            [id]
        );

        if (equipamentos.length === 0) {
            return res.status(404).json({
                mensagem: "Equipamento não encontrado."
            });
        }

        if (!podeAcessar(equipamentos[0], req.usuario)) {
            return acessoNegado(res);
        }

        await conexao.execute(
            `UPDATE Equipamentos
             SET ativo = 0
             WHERE idEquipamento = ?
               AND idCliente = ?`,
            [id, equipamentos[0].idCliente]
        );

        res.json({
            mensagem: "Equipamento desativado com sucesso!"
        });

    } catch (erro) {
        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao desativar equipamento."
        });
    }
});

// REATIVAR EQUIPAMENTO
router.patch("/:id/reativar", async (req, res) => {
    try {
        const { id } = req.params;

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID do equipamento inválido."
            });
        }

        const [equipamentos] = await conexao.execute(
            `SELECT idCliente
             FROM Equipamentos
             WHERE idEquipamento = ?`,
            [id]
        );

        if (equipamentos.length === 0) {
            return res.status(404).json({
                mensagem: "Equipamento não encontrado."
            });
        }

        if (!podeAcessar(equipamentos[0], req.usuario)) {
            return acessoNegado(res);
        }

        await conexao.execute(
            `UPDATE Equipamentos
             SET ativo = 1
             WHERE idEquipamento = ?
               AND idCliente = ?`,
            [id, equipamentos[0].idCliente]
        );

        res.json({
            mensagem: "Equipamento reativado com sucesso!"
        });

    } catch (erro) {
        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao reativar equipamento."
        });
    }
});

module.exports = router;