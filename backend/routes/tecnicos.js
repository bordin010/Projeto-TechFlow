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

// VALIDAR TELEFONE E ENDEREÇO OPCIONAIS
function dadosOpcionaisValidos(telefone, endereco) {
    return (
        (telefone == null || typeof telefone === "string") &&
        (endereco == null || typeof endereco === "string")
    );
}

// LISTAR TODOS OS TÉCNICOS
router.get("/", async (req, res) => {
    try {
        const [tecnicos] = await conexao.query(
            `SELECT idUsuario, nomeCompleto, cpf, email,
                    telefone, endereco, ativo, dataCadastro
             FROM Usuarios
             WHERE perfil = 'tecnico'
             ORDER BY nomeCompleto`
        );

        res.json(tecnicos);

    } catch (erro) {
        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao listar técnicos."
        });
    }
});

// CONSULTAR TÉCNICO PELO ID
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID inválido."
            });
        }

        const [tecnicos] = await conexao.execute(
            `SELECT idUsuario, nomeCompleto, cpf, email,
                    telefone, endereco, ativo, dataCadastro
             FROM Usuarios
             WHERE idUsuario = ? AND perfil = 'tecnico'`,
            [id]
        );

        if (tecnicos.length === 0) {
            return res.status(404).json({
                mensagem: "Técnico não encontrado."
            });
        }

        res.json(tecnicos[0]);

    } catch (erro) {
        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao consultar técnico."
        });
    }
});

// CADASTRAR TÉCNICO
router.post("/", async (req, res) => {
    try {
        const {
            nomeCompleto,
            cpf,
            email,
            telefone,
            endereco,
            senha
        } = req.body || {};

        // Validar campos obrigatórios
        if (
            typeof nomeCompleto !== "string" ||
            !nomeCompleto.trim() ||
            !cpfValido(cpf) ||
            !emailValido(email) ||
            !senhaValida(senha) ||
            !dadosOpcionaisValidos(telefone, endereco)
        ) {
            return res.status(400).json({
                mensagem: "Dados inválidos. Verifique os campos, o CPF, o e-mail e a senha."
            });
        }

        const cpfLimpo = cpf.replace(/\D/g, "");
        const emailLimpo = email.trim().toLowerCase();

        // Criptografar a senha
        const senhaHash = await bcrypt.hash(senha, 10);

        // O perfil é sempre técnico, independentemente
        // dos campos adicionais enviados pelo usuário.
        const [resultado] = await conexao.execute(
            `INSERT INTO Usuarios
             (nomeCompleto, cpf, email, telefone,
              endereco, senha, perfil)
             VALUES (?, ?, ?, ?, ?, ?, 'tecnico')`,
            [
                nomeCompleto.trim(),
                cpfLimpo,
                emailLimpo,
                telefone?.trim() || null,
                endereco?.trim() || null,
                senhaHash
            ]
        );

        res.status(201).json({
            mensagem: "Técnico cadastrado com sucesso!",
            idTecnico: resultado.insertId
        });

    } catch (erro) {
        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensagem: "CPF ou e-mail já cadastrado."
            });
        }

        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao cadastrar técnico."
        });
    }
});

// ATUALIZAR DADOS DO TÉCNICO
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const {
            nomeCompleto,
            email,
            telefone,
            endereco
        } = req.body || {};

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID inválido."
            });
        }

        if (
            typeof nomeCompleto !== "string" ||
            !nomeCompleto.trim() ||
            !emailValido(email) ||
            !dadosOpcionaisValidos(telefone, endereco)
        ) {
            return res.status(400).json({
                mensagem: "Informe dados válidos para o técnico."
            });
        }

        // Apenas campos cadastrais podem ser alterados.
        // CPF, senha, perfil e ativo não são modificados.
        const [resultado] = await conexao.execute(
            `UPDATE Usuarios
             SET nomeCompleto = ?,
                 email = ?,
                 telefone = ?,
                 endereco = ?
             WHERE idUsuario = ?
               AND perfil = 'tecnico'`,
            [
                nomeCompleto.trim(),
                email.trim().toLowerCase(),
                telefone?.trim() || null,
                endereco?.trim() || null,
                id
            ]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensagem: "Técnico não encontrado."
            });
        }

        res.json({
            mensagem: "Técnico atualizado com sucesso!"
        });

    } catch (erro) {
        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensagem: "E-mail já cadastrado."
            });
        }

        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao atualizar técnico."
        });
    }
});

// DESATIVAR TÉCNICO
router.patch("/:id/desativar", async (req, res) => {
    try {
        const { id } = req.params;

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID inválido."
            });
        }

        const [resultado] = await conexao.execute(
            `UPDATE Usuarios
             SET ativo = 0
             WHERE idUsuario = ?
               AND perfil = 'tecnico'`,
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensagem: "Técnico não encontrado."
            });
        }

        res.json({
            mensagem: "Técnico desativado com sucesso!"
        });

    } catch (erro) {
        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao desativar técnico."
        });
    }
});

// REATIVAR TÉCNICO
router.patch("/:id/reativar", async (req, res) => {
    try {
        const { id } = req.params;

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID inválido."
            });
        }

        const [resultado] = await conexao.execute(
            `UPDATE Usuarios
             SET ativo = 1
             WHERE idUsuario = ?
               AND perfil = 'tecnico'`,
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensagem: "Técnico não encontrado."
            });
        }

        res.json({
            mensagem: "Técnico reativado com sucesso!"
        });

    } catch (erro) {
        console.error(erro.message);

        res.status(500).json({
            mensagem: "Erro ao reativar técnico."
        });
    }
});

module.exports = router;