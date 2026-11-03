const express = require("express");
const bcrypt = require("bcrypt");
const conexao = require("../database/conexao");

const router = express.Router();

const {
    idValido,
    emailValido,
    senhaValida,
    cpfValido
} = require("../utils/validacoes");

// LISTAR CLIENTES
router.get("/", async (req, res) => {
    try {
        const [clientes] = await conexao.query(
            `SELECT idUsuario, nomeCompleto, cpf, email,
                    telefone, endereco, ativo, dataCadastro
             FROM Usuarios
             WHERE perfil = 'cliente'
             ORDER BY nomeCompleto`
        );

        res.json(clientes);
    } catch (erro) {
        console.error(erro.message);
        res.status(500).json({
            mensagem: "Erro ao listar clientes."
        });
    }
});

// CONSULTAR CLIENTE PELO ID
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID inválido."
            });
        }

        const [clientes] = await conexao.execute(
            `SELECT idUsuario, nomeCompleto, cpf, email,
                    telefone, endereco, ativo, dataCadastro
             FROM Usuarios
             WHERE idUsuario = ? AND perfil = 'cliente'`,
            [id]
        );

        if (clientes.length === 0) {
            return res.status(404).json({
                mensagem: "Cliente não encontrado."
            });
        }

        res.json(clientes[0]);
    } catch (erro) {
        console.error(erro.message);
        res.status(500).json({
            mensagem: "Erro ao consultar cliente."
        });
    }
});

// CADASTRAR CLIENTE
router.post("/", async (req, res) => {
    try {
        const {
            nomeCompleto,
            cpf,
            email,
            telefone,
            endereco,
            senha
        } = req.body;

        if (
            typeof nomeCompleto !== "string" ||
            !nomeCompleto.trim() ||
            !cpfValido(cpf) ||
            !emailValido(email) ||
            typeof telefone !== "string" ||
            !telefone.trim() ||
            typeof endereco !== "string" ||
            !endereco.trim() ||
            !senhaValida(senha)
        ) {
            return res.status(400).json({
                mensagem: "Dados inválidos. Verifique os campos, o CPF, o e-mail e a senha."
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const [resultado] = await conexao.execute(
            `INSERT INTO Usuarios
             (nomeCompleto, cpf, email, telefone,
              endereco, senha, perfil)
             VALUES (?, ?, ?, ?, ?, ?, 'cliente')`,
            [
                nomeCompleto.trim(),
                cpf.replace(/\D/g, ""),
                email.trim().toLowerCase(),
                telefone.trim(),
                endereco.trim(),
                senhaHash
            ]
        );

        res.status(201).json({
            mensagem: "Cliente cadastrado com sucesso!",
            idCliente: resultado.insertId
        });

    } catch (erro) {
        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensagem: "CPF ou e-mail já cadastrado."
            });
        }

        console.error(erro.message);
        res.status(500).json({
            mensagem: "Erro ao cadastrar cliente."
        });
    }
});

// ATUALIZAR CLIENTE
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { nomeCompleto, email, telefone, endereco } = req.body;

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID inválido."
            });
        }

        if (
            typeof nomeCompleto !== "string" ||
            !nomeCompleto.trim() ||
            !emailValido(email) ||
            typeof telefone !== "string" ||
            !telefone.trim() ||
            typeof endereco !== "string" ||
            !endereco.trim()
        ) {
            return res.status(400).json({
                mensagem: "Preencha os dados corretamente."
            });
        }

        const [resultado] = await conexao.execute(
            `UPDATE Usuarios
             SET nomeCompleto = ?, email = ?,
                 telefone = ?, endereco = ?
             WHERE idUsuario = ? AND perfil = 'cliente'`,
            [
                nomeCompleto.trim(),
                email.trim().toLowerCase(),
                telefone.trim(),
                endereco.trim(),
                id
            ]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensagem: "Cliente não encontrado."
            });
        }

        res.json({
            mensagem: "Cliente atualizado com sucesso!"
        });

    } catch (erro) {
        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensagem: "E-mail já cadastrado."
            });
        }

        console.error(erro.message);
        res.status(500).json({
            mensagem: "Erro ao atualizar cliente."
        });
    }
});

// DESATIVAR CLIENTE
router.patch("/:id/desativar", async (req, res) => {
    try {
        const { id } = req.params;

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID inválido."
            });
        }

        const [resultado] = await conexao.execute(
            `UPDATE Usuarios SET ativo = 0
             WHERE idUsuario = ? AND perfil = 'cliente'`,
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensagem: "Cliente não encontrado."
            });
        }

        res.json({
            mensagem: "Cliente desativado com sucesso!"
        });
    } catch (erro) {
        console.error(erro.message);
        res.status(500).json({
            mensagem: "Erro ao desativar cliente."
        });
    }
});

// REATIVAR CLIENTE
router.patch("/:id/reativar", async (req, res) => {
    try {
        const { id } = req.params;

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID inválido."
            });
        }

        const [resultado] = await conexao.execute(
            `UPDATE Usuarios SET ativo = 1
             WHERE idUsuario = ? AND perfil = 'cliente'`,
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensagem: "Cliente não encontrado."
            });
        }

        res.json({
            mensagem: "Cliente reativado com sucesso!"
        });
    } catch (erro) {
        console.error(erro.message);
        res.status(500).json({
            mensagem: "Erro ao reativar cliente."
        });
    }
});

module.exports = router;