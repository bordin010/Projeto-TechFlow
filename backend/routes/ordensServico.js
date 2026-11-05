// ==============================================
// TECHFLOW - ROTAS DE ORDENS DE SERVIÇO
// ==============================================

const express = require("express");
const router = express.Router();
const conexao = require("../database/conexao");

// ==============================================
// VALIDAÇÕES E PERMISSÕES
// ==============================================

const idValido = (id) => /^[1-9]\d*$/.test(String(id));

function podeConsultarOS(os, usuario) {
    return usuario.perfil === "administrador" ||
        (
            usuario.perfil === "cliente" &&
            Number(os.idCliente) === Number(usuario.idUsuario)
        ) ||
        (
            usuario.perfil === "tecnico" &&
            Number(os.idTecnico) === Number(usuario.idUsuario)
        );
}

function podeAtenderOS(os, usuario) {
    return usuario.perfil === "administrador" ||
        (
            usuario.perfil === "tecnico" &&
            Number(os.idTecnico) === Number(usuario.idUsuario)
        );
}

function podeEditarOS(os, usuario) {
    return usuario.perfil === "administrador" ||
        (
            usuario.perfil === "cliente" &&
            Number(os.idCliente) === Number(usuario.idUsuario)
        );
}

function acessoNegado(res) {
    return res.status(403).json({
        mensagem: "Você não tem permissão para realizar esta ação nesta OS."
    });
}

// ==============================================
// CONSULTA COM INFORMAÇÕES DO CLIENTE
// E DO EQUIPAMENTO
// ==============================================

const consultaCompletaOS = `
    SELECT
        os.*,
        cliente.nomeCompleto AS nomeCliente,
        equipamento.nomeEquipamento AS nomeEquipamento,
        equipamento.marca AS marcaEquipamento,
        equipamento.modelo AS modeloEquipamento
    FROM OrdensServico AS os
    LEFT JOIN Usuarios AS cliente
        ON cliente.idUsuario = os.idCliente
        AND cliente.perfil = 'cliente'
    LEFT JOIN Equipamentos AS equipamento
        ON equipamento.idEquipamento = os.idEquipamento
        AND equipamento.idCliente = os.idCliente
`;

// ==============================================
// LISTAR ORDENS CONFORME O PERFIL
// ==============================================

router.get("/", async (req, res) => {

    try {

        const usuario = req.usuario;

        let sql = consultaCompletaOS;
        const parametros = [];

        if (usuario.perfil === "cliente") {

            sql += " WHERE os.idCliente = ?";
            parametros.push(usuario.idUsuario);

        } else if (usuario.perfil === "tecnico") {

            sql += " WHERE os.idTecnico = ?";
            parametros.push(usuario.idUsuario);

        } else if (usuario.perfil !== "administrador") {

            return acessoNegado(res);
        }

        sql += " ORDER BY os.idOS DESC";

        const [ordens] = await conexao.execute(
            sql,
            parametros
        );

        return res.json(ordens);

    } catch (erro) {

        console.error(erro.message);

        return res.status(500).json({
            mensagem: "Erro ao consultar Ordens de Serviço."
        });
    }
});

// ==============================================
// CONSULTAR UMA OS PELO ID
// ==============================================

router.get("/:id", async (req, res) => {

    try {

        const { id } = req.params;

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID da OS inválido."
            });
        }

        const [ordens] = await conexao.execute(
            consultaCompletaOS + " WHERE os.idOS = ?",
            [id]
        );

        if (ordens.length === 0) {
            return res.status(404).json({
                mensagem: "Ordem de Serviço não encontrada."
            });
        }

        if (!podeConsultarOS(ordens[0], req.usuario)) {
            return acessoNegado(res);
        }

        return res.json(ordens[0]);

    } catch (erro) {

        console.error(erro.message);

        return res.status(500).json({
            mensagem: "Erro ao consultar Ordem de Serviço."
        });
    }
});

// ==============================================
// CADASTRAR NOVA OS
// ==============================================

router.post("/", async (req, res) => {

    const {
        idCliente,
        idEquipamento,
        idTipoServico,
        descricaoProblema
    } = req.body || {};

    const usuario = req.usuario;

    if (!["administrador", "cliente"].includes(usuario.perfil)) {
        return acessoNegado(res);
    }

    if (
        !idValido(idCliente) ||
        !idValido(idEquipamento) ||
        !idValido(idTipoServico) ||
        typeof descricaoProblema !== "string" ||
        !descricaoProblema.trim()
    ) {
        return res.status(400).json({
            mensagem: "Preencha todos os campos obrigatórios."
        });
    }

    if (
        usuario.perfil === "cliente" &&
        Number(idCliente) !== Number(usuario.idUsuario)
    ) {
        return acessoNegado(res);
    }

    let db;

    try {

        db = await conexao.getConnection();
        await db.beginTransaction();

        // Verificar cliente
        const [clientes] = await db.execute(
            `SELECT idUsuario
             FROM Usuarios
             WHERE idUsuario = ?
               AND perfil = 'cliente'
               AND ativo = 1`,
            [idCliente]
        );

        if (clientes.length === 0) {

            await db.rollback();

            return res.status(400).json({
                mensagem: "Cliente inválido ou inativo."
            });
        }

        // Verificar equipamento do cliente
        const [equipamentos] = await db.execute(
            `SELECT idEquipamento
             FROM Equipamentos
             WHERE idEquipamento = ?
               AND idCliente = ?
               AND ativo = 1`,
            [idEquipamento, idCliente]
        );

        if (equipamentos.length === 0) {

            await db.rollback();

            return res.status(400).json({
                mensagem: "Equipamento inválido."
            });
        }

        // Verificar tipo de serviço
        const [servicos] = await db.execute(
            `SELECT idTipoServico
             FROM TiposServico
             WHERE idTipoServico = ?
               AND ativo = 1`,
            [idTipoServico]
        );

        if (servicos.length === 0) {

            await db.rollback();

            return res.status(400).json({
                mensagem: "Tipo de serviço inválido."
            });
        }

        // Cadastrar OS
        const [resultado] = await db.execute(
            `INSERT INTO OrdensServico
                (
                    idCliente,
                    idEquipamento,
                    idTipoServico,
                    descricaoProblema
                )
             VALUES (?, ?, ?, ?)`,
            [
                idCliente,
                idEquipamento,
                idTipoServico,
                descricaoProblema.trim()
            ]
        );

        // Registrar primeiro histórico
        await db.execute(
            `INSERT INTO HistoricoStatus
                (idOS, statusAnterior, statusNovo)
             VALUES (?, ?, ?)`,
            [resultado.insertId, null, "Aberta"]
        );

        await db.commit();

        return res.status(201).json({
            mensagem: "Ordem de Serviço cadastrada com sucesso!",
            idOS: resultado.insertId
        });

    } catch (erro) {

        if (db) {
            await db.rollback();
        }

        console.error(erro.message);

        return res.status(500).json({
            mensagem: "Erro ao cadastrar Ordem de Serviço."
        });

    } finally {

        if (db) {
            db.release();
        }
    }
});

// ==============================================
// ATUALIZAR DESCRIÇÃO DA OS
// ==============================================

router.put("/:id", async (req, res) => {

    try {

        const { id } = req.params;
        const { descricaoProblema } = req.body || {};

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID da OS inválido."
            });
        }

        if (
            typeof descricaoProblema !== "string" ||
            !descricaoProblema.trim()
        ) {
            return res.status(400).json({
                mensagem: "Informe uma descrição válida."
            });
        }

        if (
            !["administrador", "cliente"].includes(
                req.usuario.perfil
            )
        ) {
            return acessoNegado(res);
        }

        const sql = req.usuario.perfil === "administrador"
            ? `UPDATE OrdensServico
               SET descricaoProblema = ?
               WHERE idOS = ?
               AND statusOS NOT IN ('Concluída', 'Cancelada')`
            : `UPDATE OrdensServico
               SET descricaoProblema = ?
               WHERE idOS = ?
               AND idCliente = ?
               AND statusOS NOT IN ('Concluída', 'Cancelada')`;

        const parametros = [
            descricaoProblema.trim(),
            id
        ];

        if (req.usuario.perfil === "cliente") {
            parametros.push(req.usuario.idUsuario);
        }

        const [resultado] = await conexao.execute(
            sql,
            parametros
        );

        if (resultado.affectedRows === 0) {

            const [ordens] = await conexao.execute(
                `SELECT idCliente, idTecnico, statusOS
                 FROM OrdensServico
                 WHERE idOS = ?`,
                [id]
            );

            if (ordens.length === 0) {
                return res.status(404).json({
                    mensagem: "Ordem de Serviço não encontrada."
                });
            }

            if (!podeEditarOS(ordens[0], req.usuario)) {
                return acessoNegado(res);
            }

            return res.status(400).json({
                mensagem: "Esta OS não permite alteração."
            });
        }

        return res.json({
            mensagem: "Ordem de Serviço atualizada com sucesso!"
        });

    } catch (erro) {

        console.error(erro.message);

        return res.status(500).json({
            mensagem: "Erro ao atualizar Ordem de Serviço."
        });
    }
});

// ==============================================
// ALTERAR STATUS DA OS
// ==============================================

router.patch("/:id/status", async (req, res) => {

    const { id } = req.params;
    const { novoStatus } = req.body || {};

    const statusPermitidos = [
        "Em análise",
        "Em andamento",
        "Aguardando peça",
        "Concluída"
    ];

    if (!idValido(id)) {
        return res.status(400).json({
            mensagem: "ID da OS inválido."
        });
    }

    if (!statusPermitidos.includes(novoStatus)) {
        return res.status(400).json({
            mensagem: "Status inválido."
        });
    }

    if (
        !["administrador", "tecnico"].includes(
            req.usuario.perfil
        )
    ) {
        return acessoNegado(res);
    }

    let db;

    try {

        db = await conexao.getConnection();
        await db.beginTransaction();

        const [ordens] = await db.execute(
            `SELECT
                idCliente,
                idTecnico,
                statusOS,
                diagnostico,
                solucaoAplicada
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

        if (!podeAtenderOS(os, req.usuario)) {

            await db.rollback();
            return acessoNegado(res);
        }

        const statusAnterior = os.statusOS;

        if (
            ["Concluída", "Cancelada"].includes(statusAnterior)
        ) {

            await db.rollback();

            return res.status(400).json({
                mensagem: "Esta OS está finalizada."
            });
        }

        if (statusAnterior === novoStatus) {

            await db.rollback();

            return res.status(400).json({
                mensagem: "A OS já possui esse status."
            });
        }

        // Exigir diagnóstico e solução para conclusão
        if (
            novoStatus === "Concluída" &&
            (
                !os.diagnostico?.trim() ||
                !os.solucaoAplicada?.trim()
            )
        ) {

            await db.rollback();

            return res.status(400).json({
                mensagem: "Informe o diagnóstico e a solução antes de concluir."
            });
        }

        // Atualizar status
        await db.execute(
            `UPDATE OrdensServico
             SET
                statusOS = ?,
                dataConclusao = CASE
                    WHEN ? = 'Concluída' THEN NOW()
                    ELSE dataConclusao
                END
             WHERE idOS = ?`,
            [novoStatus, novoStatus, id]
        );

        // Salvar histórico
        await db.execute(
            `INSERT INTO HistoricoStatus
                (idOS, statusAnterior, statusNovo)
             VALUES (?, ?, ?)`,
            [id, statusAnterior, novoStatus]
        );

        await db.commit();

        return res.json({
            mensagem: "Status atualizado com sucesso!",
            statusAnterior,
            novoStatus
        });

    } catch (erro) {

        if (db) {
            await db.rollback();
        }

        console.error(erro.message);

        return res.status(500).json({
            mensagem: "Erro ao atualizar status."
        });

    } finally {

        if (db) {
            db.release();
        }
    }
});

// ==============================================
// CANCELAR ORDEM DE SERVIÇO
// ==============================================

router.patch("/:id/cancelar", async (req, res) => {

    const { id } = req.params;
    const { justificativa } = req.body || {};

    if (!idValido(id)) {
        return res.status(400).json({
            mensagem: "ID da OS inválido."
        });
    }

    if (
        typeof justificativa !== "string" ||
        !justificativa.trim()
    ) {
        return res.status(400).json({
            mensagem: "Informe o motivo do cancelamento."
        });
    }

    if (
        !["administrador", "cliente"].includes(
            req.usuario.perfil
        )
    ) {
        return acessoNegado(res);
    }

    let db;

    try {

        db = await conexao.getConnection();
        await db.beginTransaction();

        const [ordens] = await db.execute(
            `SELECT idCliente, idTecnico, statusOS
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

        if (!podeEditarOS(ordens[0], req.usuario)) {

            await db.rollback();
            return acessoNegado(res);
        }

        const statusAnterior = ordens[0].statusOS;

        if (
            !["Aberta", "Em análise"].includes(statusAnterior)
        ) {

            await db.rollback();

            return res.status(400).json({
                mensagem: "Esta OS não pode ser cancelada nesta etapa."
            });
        }

        await db.execute(
            `UPDATE OrdensServico
             SET
                statusOS = 'Cancelada',
                justificativaCancelamento = ?,
                dataCancelamento = NOW()
             WHERE idOS = ?`,
            [justificativa.trim(), id]
        );

        await db.execute(
            `INSERT INTO HistoricoStatus
                (idOS, statusAnterior, statusNovo)
             VALUES (?, ?, ?)`,
            [id, statusAnterior, "Cancelada"]
        );

        await db.commit();

        return res.json({
            mensagem: "OS cancelada e histórico registrado!"
        });

    } catch (erro) {

        if (db) {
            await db.rollback();
        }

        console.error(erro.message);

        return res.status(500).json({
            mensagem: "Erro ao cancelar Ordem de Serviço."
        });

    } finally {

        if (db) {
            db.release();
        }
    }
});

// ==============================================
// REGISTRAR DIAGNÓSTICO E SOLUÇÃO
// ==============================================

router.patch("/:id/diagnostico", async (req, res) => {

    try {

        const { id } = req.params;

        const {
            diagnostico,
            solucaoAplicada
        } = req.body || {};

        if (!idValido(id)) {
            return res.status(400).json({
                mensagem: "ID da OS inválido."
            });
        }

        if (
            typeof diagnostico !== "string" ||
            !diagnostico.trim() ||
            typeof solucaoAplicada !== "string" ||
            !solucaoAplicada.trim()
        ) {
            return res.status(400).json({
                mensagem: "Informe o diagnóstico e a solução aplicada."
            });
        }

        if (
            !["administrador", "tecnico"].includes(
                req.usuario.perfil
            )
        ) {
            return acessoNegado(res);
        }

        const sql = req.usuario.perfil === "administrador"
            ? `UPDATE OrdensServico
               SET diagnostico = ?, solucaoAplicada = ?
               WHERE idOS = ?
               AND statusOS NOT IN ('Concluída', 'Cancelada')`
            : `UPDATE OrdensServico
               SET diagnostico = ?, solucaoAplicada = ?
               WHERE idOS = ?
               AND idTecnico = ?
               AND statusOS NOT IN ('Concluída', 'Cancelada')`;

        const parametros = [
            diagnostico.trim(),
            solucaoAplicada.trim(),
            id
        ];

        if (req.usuario.perfil === "tecnico") {
            parametros.push(req.usuario.idUsuario);
        }

        const [resultado] = await conexao.execute(
            sql,
            parametros
        );

        if (resultado.affectedRows === 0) {

            const [ordens] = await conexao.execute(
                `SELECT idCliente, idTecnico, statusOS
                 FROM OrdensServico
                 WHERE idOS = ?`,
                [id]
            );

            if (ordens.length === 0) {
                return res.status(404).json({
                    mensagem: "Ordem de Serviço não encontrada."
                });
            }

            if (!podeAtenderOS(ordens[0], req.usuario)) {
                return acessoNegado(res);
            }

            return res.status(400).json({
                mensagem: "OS não permite alteração de diagnóstico."
            });
        }

        return res.json({
            mensagem: "Diagnóstico e solução registrados com sucesso!"
        });

    } catch (erro) {

        console.error(erro.message);

        return res.status(500).json({
            mensagem: "Erro ao registrar diagnóstico e solução."
        });
    }
});

// ==============================================
// EXPORTAR ROTAS
// ==============================================

module.exports = router;