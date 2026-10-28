const express = require("express");
const db = require("./db");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        mensagem: "API do TechFlow funcionando!"
    });
});

app.post("/api/login", async (req, res) => {
const { email, senha, perfil } = req.body;

if (!email || !senha || !perfil) {
    return res.status(400).json({
        erro: "E-mail, senha e perfil são obrigatórios."
    });
}

if (!["admin", "tecnico"].includes(perfil)) {
    return res.status(400).json({
        erro: "Perfil inválido."
    });
}

try {
    const [usuarios] = await db.query(
        `SELECT id_usuario, nome, email, senha, tipo
         FROM usuarios
         WHERE email = ? AND tipo = ?`,
        [email.trim(), perfil]
    );

    if (usuarios.length === 0) {
        return res.status(401).json({
            erro: "E-mail ou senha inválidos."
        });
    }

    const usuario = usuarios[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
        return res.status(401).json({
            erro: "E-mail ou senha inválidos."
        });
    }

    return res.json({
        mensagem: "Login realizado com sucesso!",
        usuario: {
            id: usuario.id_usuario,
            nome: usuario.nome,
            email: usuario.email,
            perfil: usuario.tipo
        }
    });
} catch (erro) {
    console.error("Erro ao realizar login:", erro.message);

    return res.status(500).json({
        erro: "Não foi possível realizar o login."
    });
}

});

app.get("/api/status-os", async (req, res) => {
    try {
        const [status] = await db.query(
            "SELECT id_status, nome FROM status_os ORDER BY id_status"
        );

        res.json(status);
    } catch (erro) {
        console.error("Erro ao consultar status:", erro.message);

        res.status(500).json({
            erro: "Não foi possível consultar os status das ordens de serviço."
        });
    }
});

app.get("/api/clientes", async (req, res) => {
    try {
        const [clientes] = await db.query(`
            SELECT
                c.id_cliente,
                u.nome,
                u.email,
                c.telefone,
                c.endereco
            FROM clientes c
            INNER JOIN usuarios u
                ON c.id_usuario = u.id_usuario
        `);

        res.json(clientes);
    } catch (erro) {
        console.error("Erro ao consultar clientes:", erro.message);

        res.status(500).json({
            erro: "Não foi possível consultar os clientes."
        });
    }
});

app.get("/api/clientes/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: "ID do cliente inválido."
            });
        }

        const [clientes] = await db.query(
            `SELECT
                c.id_cliente,
                u.nome,
                u.email,
                c.telefone,
                c.endereco
             FROM clientes c
             INNER JOIN usuarios u
                ON c.id_usuario = u.id_usuario
             WHERE c.id_cliente = ?`,
            [id]
        );

        if (clientes.length === 0) {
            return res.status(404).json({
                erro: "Cliente não encontrado."
            });
        }

        res.json(clientes[0]);
    } catch (erro) {
        console.error("Erro ao buscar cliente:", erro.message);

        res.status(500).json({
            erro: "Não foi possível buscar o cliente."
        });
    }
});

app.post("/api/clientes", async (req, res) => {
    const { nome, email, senha, telefone, endereco } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({
            erro: "Nome, email e senha são obrigatórios."
        });
    }

    let conexao;

    try {
        conexao = await db.getConnection();
        await conexao.beginTransaction();

        const senhaHash = await bcrypt.hash(senha,10);

        const [usuario] = await conexao.query(
            `INSERT INTO usuarios (nome, email, senha, tipo)
             VALUES (?, ?, ?, 'cliente')`,
            [nome, email, senhaHash]
        );

        await conexao.query(
            `INSERT INTO clientes (telefone, endereco, id_usuario)
             VALUES (?, ?, ?)`,
            [telefone || null, endereco || null, usuario.insertId]
        );

        await conexao.commit();

        res.status(201).json({
            mensagem: "Cliente cadastrado com sucesso!",
            id_cliente: usuario.insertId
        });
    } catch (erro) {
        if (conexao) {
            await conexao.rollback();
        }

        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                erro: "Este email já está cadastrado."
            });
        }

        console.error("Erro ao cadastrar cliente:", erro.message);

        res.status(500).json({
            erro: "Não foi possível cadastrar o cliente."
        });
    } finally {
        if (conexao) {
            conexao.release();
        }
    }
});

app.put("/api/clientes/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { nome, email, telefone, endereco } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: "ID do cliente inválido."
        });
    }

    if (!nome || !email) {
        return res.status(400).json({
            erro: "Nome e email são obrigatórios."
        });
    }

    try {
        const [clientes] = await db.query(
            `SELECT id_usuario
             FROM clientes
             WHERE id_cliente = ?`,
            [id]
        );

        if (clientes.length === 0) {
            return res.status(404).json({
                erro: "Cliente não encontrado."
            });
        }

        const idUsuario = clientes[0].id_usuario;

        await db.query(
            `UPDATE usuarios
             SET nome = ?, email = ?
             WHERE id_usuario = ?`,
            [nome, email, idUsuario]
        );

        await db.query(
            `UPDATE clientes
             SET telefone = ?, endereco = ?
             WHERE id_cliente = ?`,
            [telefone || null, endereco || null, id]
        );

        res.json({
            mensagem: "Cliente atualizado com sucesso!",
            id_cliente: id
        });
    } catch (erro) {
        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                erro: "Este email já está cadastrado."
            });
        }

        console.error("Erro ao atualizar cliente:", erro.message);

        res.status(500).json({
            erro: "Não foi possível atualizar o cliente."
        });
    }
});

app.delete("/api/clientes/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: "ID do cliente inválido."
        });
    }

    let conexao;

    try {
        conexao = await db.getConnection();
        await conexao.beginTransaction();

        const [clientes] = await conexao.query(
            `SELECT id_usuario
             FROM clientes
             WHERE id_cliente = ?`,
            [id]
        );

        if (clientes.length === 0) {
            await conexao.rollback();

            return res.status(404).json({
                erro: "Cliente não encontrado."
            });
        }

        const idUsuario = clientes[0].id_usuario;

        const [ordens] = await conexao.query(
            `SELECT id_os
             FROM ordens_servico
             WHERE id_cliente = ?
             LIMIT 1`,
            [id]
        );

        if (ordens.length > 0) {
            await conexao.rollback();

            return res.status(409).json({
                erro: "Não é possível excluir um cliente que possui ordens de serviço."
            });
        }

        const [equipamentos] = await conexao.query(
            `SELECT id_equipamento
             FROM equipamentos
             WHERE id_cliente = ?
             LIMIT 1`,
            [id]
        );

        if (equipamentos.length > 0) {
            await conexao.rollback();

            return res.status(409).json({
                erro: "Não é possível excluir um cliente que possui equipamentos cadastrados."
            });
        }

        await conexao.query(
            `DELETE FROM clientes WHERE id_cliente = ?`,
            [id]
        );

        await conexao.query(
            `DELETE FROM usuarios WHERE id_usuario = ?`,
            [idUsuario]
        );

        await conexao.commit();

        res.json({
            mensagem: "Cliente excluído com sucesso!",
            id_cliente: id
        });
    } catch (erro) {
        if (conexao) {
            await conexao.rollback();
        }

        console.error("Erro ao excluir cliente:", erro.message);

        res.status(500).json({
            erro: "Não foi possível excluir o cliente."
        });
    } finally {
        if (conexao) {
            conexao.release();
        }
    }
});

app.get("/api/tecnicos", async (req, res) => {
    try {
        const [tecnicos] = await db.query(`
            SELECT
                t.id_tecnico,
                u.nome,
                u.email,
                t.especialidade,
                t.telefone
            FROM tecnicos t
            INNER JOIN usuarios u
                ON t.id_usuario = u.id_usuario
        `);

        res.json(tecnicos);
    } catch (erro) {
        console.error("Erro ao consultar técnicos:", erro.message);

        res.status(500).json({
            erro: "Não foi possível consultar os técnicos."
        });
    }
});

app.get("/api/tecnicos/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: "ID do técnico inválido."
            });
        }

        const [tecnicos] = await db.query(
            `SELECT
                t.id_tecnico,
                u.nome,
                u.email,
                t.especialidade,
                t.telefone
             FROM tecnicos t
             INNER JOIN usuarios u
                ON t.id_usuario = u.id_usuario
             WHERE t.id_tecnico = ?`,
            [id]
        );

        if (tecnicos.length === 0) {
            return res.status(404).json({
                erro: "Técnico não encontrado."
            });
        }

        res.json(tecnicos[0]);
    } catch (erro) {
        console.error("Erro ao buscar técnico:", erro.message);

        res.status(500).json({
            erro: "Não foi possível buscar o técnico."
        });
    }
});

app.put("/api/tecnicos/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { nome, email, especialidade, telefone } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: "ID do técnico inválido."
        });
    }

    if (!nome || !email) {
        return res.status(400).json({
            erro: "Nome e email são obrigatórios."
        });
    }

    try {
        const [tecnicos] = await db.query(
            `SELECT id_usuario
             FROM tecnicos
             WHERE id_tecnico = ?`,
            [id]
        );

        if (tecnicos.length === 0) {
            return res.status(404).json({
                erro: "Técnico não encontrado."
            });
        }

        const idUsuario = tecnicos[0].id_usuario;

        await db.query(
            `UPDATE usuarios
             SET nome = ?, email = ?
             WHERE id_usuario = ?`,
            [nome.trim(), email.trim(), idUsuario]
        );

        await db.query(
            `UPDATE tecnicos
             SET especialidade = ?, telefone = ?
             WHERE id_tecnico = ?`,
            [especialidade || null, telefone || null, id]
        );

        res.json({
            mensagem: "Técnico atualizado com sucesso!",
            id_tecnico: id
        });
    } catch (erro) {
        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                erro: "Este email já está cadastrado."
            });
        }

        console.error("Erro ao atualizar técnico:", erro.message);

        res.status(500).json({
            erro: "Não foi possível atualizar o técnico."
        });
    }
});

app.post("/api/tecnicos", async (req, res) => {
    const { nome, email, senha, especialidade, telefone } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({
            erro: "Nome, email e senha são obrigatórios."
        });
    }

    if (typeof nome !== "string" || typeof email !== "string" || typeof senha !== "string") {
        return res.status(400).json({
            erro: "Nome, email e senha devem ser textos."
        });
    }

    let conexao;

    try {
        conexao = await db.getConnection();
        await conexao.beginTransaction();

        const senhaHash = await bcrypt.hash(senha, 10);

        const [usuario] = await conexao.query(
            `INSERT INTO usuarios (nome, email, senha, tipo)
             VALUES (?, ?, ?, 'tecnico')`,
            [nome.trim(), email.trim(), senhaHash]
        );

        await conexao.query(
            `INSERT INTO tecnicos (especialidade, telefone, id_usuario)
             VALUES (?, ?, ?)`,
            [especialidade || null, telefone || null, usuario.insertId]
        );

        await conexao.commit();

        res.status(201).json({
            mensagem: "Técnico cadastrado com sucesso!",
            id_usuario: usuario.insertId
        });
    } catch (erro) {
        if (conexao) {
            await conexao.rollback();
        }

        if (erro.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                erro: "Este email já está cadastrado."
            });
        }

        console.error("Erro ao cadastrar técnico:", erro.message);

        res.status(500).json({
            erro: "Não foi possível cadastrar o técnico."
        });
    } finally {
        if (conexao) {
            conexao.release();
        }
    }
});

app.delete("/api/tecnicos/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: "ID do técnico inválido."
        });
    }

    let conexao;

    try {
        conexao = await db.getConnection();
        await conexao.beginTransaction();

        const [tecnicos] = await conexao.query(
            `SELECT id_usuario
             FROM tecnicos
             WHERE id_tecnico = ?`,
            [id]
        );

        if (tecnicos.length === 0) {
            await conexao.rollback();

            return res.status(404).json({
                erro: "Técnico não encontrado."
            });
        }

        const [ordens] = await conexao.query(
            `SELECT id_os
             FROM ordens_servico
             WHERE id_tecnico = ?
             LIMIT 1`,
            [id]
        );

        if (ordens.length > 0) {
            await conexao.rollback();

            return res.status(409).json({
                erro: "Não é possível excluir este técnico, pois ele está vinculado a uma ordem de serviço."
            });
        }

        const idUsuario = tecnicos[0].id_usuario;

        await conexao.query(
            "DELETE FROM tecnicos WHERE id_tecnico = ?",
            [id]
        );

        await conexao.query(
            "DELETE FROM usuarios WHERE id_usuario = ?",
            [idUsuario]
        );

        await conexao.commit();

        res.json({
            mensagem: "Técnico excluído com sucesso!"
        });
    } catch (erro) {
        if (conexao) {
            await conexao.rollback();
        }

        console.error("Erro ao excluir técnico:", erro.message);

        res.status(500).json({
            erro: "Não foi possível excluir o técnico."
        });
    } finally {
        if (conexao) {
            conexao.release();
        }
    }
});

app.get("/api/ordens-servico", async (req, res) => {
    try {
        const [ordens] = await db.query(`
            SELECT
                os.id_os,
                os.descricao,
                os.data_abertura,
                os.data_conclusao,
                os.prioridade,
                c.id_cliente,
                uc.nome AS nome_cliente,
                t.id_tecnico,
                ut.nome AS nome_tecnico,
                e.tipo AS tipo_equipamento,
                e.marca AS marca_equipamento,
                e.modelo AS modelo_equipamento,
                s.id_status,
                s.nome AS status
            FROM ordens_servico os
            INNER JOIN clientes c
                ON os.id_cliente = c.id_cliente
            INNER JOIN usuarios uc
                ON c.id_usuario = uc.id_usuario
            LEFT JOIN tecnicos t
                ON os.id_tecnico = t.id_tecnico
            LEFT JOIN usuarios ut
                ON t.id_usuario = ut.id_usuario
            INNER JOIN equipamentos e
                ON os.id_equipamento = e.id_equipamento
            INNER JOIN status_os s
                ON os.id_status = s.id_status
            ORDER BY os.id_os DESC
        `);

        res.json(ordens);
    } catch (erro) {
        console.error("Erro ao consultar ordens:", erro.message);

        res.status(500).json({
            erro: "Não foi possível consultar as ordens de serviço."
        });
    }
});

app.get("/api/ordens-servico/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: "ID da ordem de serviço inválido."
        });
    }

    try {
        const [ordens] = await db.query(`
            SELECT
                os.id_os,
                os.descricao,
                os.data_abertura,
                os.data_conclusao,
                os.prioridade,
                c.id_cliente,
                uc.nome AS nome_cliente,
                t.id_tecnico,
                ut.nome AS nome_tecnico,
                e.id_equipamento,
                e.tipo AS tipo_equipamento,
                e.marca AS marca_equipamento,
                e.modelo AS modelo_equipamento,
                s.id_status,
                s.nome AS status
            FROM ordens_servico os
            INNER JOIN clientes c
                ON os.id_cliente = c.id_cliente
            INNER JOIN usuarios uc
                ON c.id_usuario = uc.id_usuario
            LEFT JOIN tecnicos t
                ON os.id_tecnico = t.id_tecnico
            LEFT JOIN usuarios ut
                ON t.id_usuario = ut.id_usuario
            INNER JOIN equipamentos e
                ON os.id_equipamento = e.id_equipamento
            INNER JOIN status_os s
                ON os.id_status = s.id_status
            WHERE os.id_os = ?
        `, [id]);

        if (ordens.length === 0) {
            return res.status(404).json({
                erro: "Ordem de serviço não encontrada."
            });
        }

        res.json(ordens[0]);
    } catch (erro) {
        console.error("Erro ao consultar ordem:", erro.message);

        res.status(500).json({
            erro: "Não foi possível consultar a ordem de serviço."
        });
    }
});

app.post("/api/ordens-servico", async (req, res) => {
    const {
        descricao,
        prioridade,
        id_cliente,
        id_tecnico,
        id_equipamento,
        id_status
    } = req.body;

    if (
        typeof descricao !== "string" ||
        descricao.trim() === "" ||
        !id_cliente ||
        !id_equipamento ||
        !id_status
    ) {
        return res.status(400).json({
            erro: "Descrição, cliente, equipamento e status são obrigatórios."
        });
    }

    const prioridadeFinal = prioridade || "media";
    const prioridadesValidas = ["baixa", "media", "alta"];

    if (!prioridadesValidas.includes(prioridadeFinal)) {
        return res.status(400).json({
            erro: "Prioridade inválida. Use baixa, media ou alta."
        });
    }

    const clienteId = Number(id_cliente);
    const equipamentoId = Number(id_equipamento);
    const statusId = Number(id_status);
    const tecnicoId = id_tecnico ? Number(id_tecnico) : null;

    if (
        !Number.isInteger(clienteId) || clienteId <= 0 ||
        !Number.isInteger(equipamentoId) || equipamentoId <= 0 ||
        !Number.isInteger(statusId) || statusId <= 0 ||
        (tecnicoId !== null &&
            (!Number.isInteger(tecnicoId) || tecnicoId <= 0))
    ) {
        return res.status(400).json({
            erro: "Um ou mais IDs informados são inválidos."
        });
    }

    let conexao;

    try {
        conexao = await db.getConnection();
        await conexao.beginTransaction();

        const [clientes] = await conexao.query(
            "SELECT id_cliente FROM clientes WHERE id_cliente = ?",
            [clienteId]
        );

        if (clientes.length === 0) {
            await conexao.rollback();
            return res.status(400).json({
                erro: "O cliente informado não existe."
            });
        }

        const [equipamentos] = await conexao.query(
            `SELECT id_equipamento
             FROM equipamentos
             WHERE id_equipamento = ? AND id_cliente = ?`,
            [equipamentoId, clienteId]
        );

        if (equipamentos.length === 0) {
            await conexao.rollback();
            return res.status(400).json({
                erro: "O equipamento não existe ou não pertence ao cliente informado."
            });
        }

        const [status] = await conexao.query(
            "SELECT id_status FROM status_os WHERE id_status = ?",
            [statusId]
        );

        if (status.length === 0) {
            await conexao.rollback();
            return res.status(400).json({
                erro: "O status informado não existe."
            });
        }

        if (tecnicoId !== null) {
            const [tecnicos] = await conexao.query(
                "SELECT id_tecnico FROM tecnicos WHERE id_tecnico = ?",
                [tecnicoId]
            );

            if (tecnicos.length === 0) {
                await conexao.rollback();
                return res.status(400).json({
                    erro: "O técnico informado não existe."
                });
            }
        }

        const [resultado] = await conexao.query(
            `INSERT INTO ordens_servico (
                descricao,
                prioridade,
                id_cliente,
                id_tecnico,
                id_equipamento,
                id_status
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                descricao.trim(),
                prioridadeFinal,
                clienteId,
                tecnicoId,
                equipamentoId,
                statusId
            ]
        );

        await conexao.commit();

        res.status(201).json({
            mensagem: "Ordem de serviço cadastrada com sucesso!",
            id_os: resultado.insertId
        });
    } catch (erro) {
        if (conexao) {
            await conexao.rollback();
        }

        console.error("Erro ao cadastrar ordem:", erro.message);

        res.status(500).json({
            erro: "Não foi possível cadastrar a ordem de serviço."
        });
    } finally {
        if (conexao) {
            conexao.release();
        }
    }
});

app.put("/api/ordens-servico/:id", async (req, res) => {
    const id = Number(req.params.id);

    const {
        descricao,
        prioridade,
        id_cliente,
        id_tecnico,
        id_equipamento,
        id_status
    } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: "ID da ordem de serviço inválido."
        });
    }

    if (
        typeof descricao !== "string" ||
        descricao.trim() === "" ||
        !id_cliente ||
        !id_equipamento ||
        !id_status
    ) {
        return res.status(400).json({
            erro: "Descrição, cliente, equipamento e status são obrigatórios."
        });
    }

    const prioridadeFinal = prioridade || "media";

    if (!["baixa", "media", "alta"].includes(prioridadeFinal)) {
        return res.status(400).json({
            erro: "Prioridade inválida. Use baixa, media ou alta."
        });
    }

    const clienteId = Number(id_cliente);
    const equipamentoId = Number(id_equipamento);
    const statusId = Number(id_status);
    const tecnicoId = id_tecnico ? Number(id_tecnico) : null;

    if (
        !Number.isInteger(clienteId) || clienteId <= 0 ||
        !Number.isInteger(equipamentoId) || equipamentoId <= 0 ||
        !Number.isInteger(statusId) || statusId <= 0 ||
        (tecnicoId !== null &&
            (!Number.isInteger(tecnicoId) || tecnicoId <= 0))
    ) {
        return res.status(400).json({
            erro: "Um ou mais IDs informados são inválidos."
        });
    }

    let conexao;

    try {
        conexao = await db.getConnection();
        await conexao.beginTransaction();

        const [ordens] = await conexao.query(
            "SELECT id_os FROM ordens_servico WHERE id_os = ?",
            [id]
        );

        if (ordens.length === 0) {
            await conexao.rollback();

            return res.status(404).json({
                erro: "Ordem de serviço não encontrada."
            });
        }

        const [clientes] = await conexao.query(
            "SELECT id_cliente FROM clientes WHERE id_cliente = ?",
            [clienteId]
        );

        if (clientes.length === 0) {
            await conexao.rollback();

            return res.status(400).json({
                erro: "O cliente informado não existe."
            });
        }

        const [equipamentos] = await conexao.query(
            `SELECT id_equipamento
             FROM equipamentos
             WHERE id_equipamento = ? AND id_cliente = ?`,
            [equipamentoId, clienteId]
        );

        if (equipamentos.length === 0) {
            await conexao.rollback();

            return res.status(400).json({
                erro: "O equipamento não existe ou não pertence ao cliente informado."
            });
        }

        const [status] = await conexao.query(
            "SELECT id_status FROM status_os WHERE id_status = ?",
            [statusId]
        );

        if (status.length === 0) {
            await conexao.rollback();

            return res.status(400).json({
                erro: "O status informado não existe."
            });
        }

        if (tecnicoId !== null) {
            const [tecnicos] = await conexao.query(
                "SELECT id_tecnico FROM tecnicos WHERE id_tecnico = ?",
                [tecnicoId]
            );

            if (tecnicos.length === 0) {
                await conexao.rollback();

                return res.status(400).json({
                    erro: "O técnico informado não existe."
                });
            }
        }

        await conexao.query(
            `UPDATE ordens_servico
             SET descricao = ?,
                 prioridade = ?,
                 id_cliente = ?,
                 id_tecnico = ?,
                 id_equipamento = ?,
                 id_status = ?,
                 data_conclusao = CASE
                     WHEN ? = 4 THEN COALESCE(data_conclusao, CURRENT_TIMESTAMP)
                     ELSE NULL
                 END
             WHERE id_os = ?`,
            [
                descricao.trim(),
                prioridadeFinal,
                clienteId,
                tecnicoId,
                equipamentoId,
                statusId,
                statusId,
                id
            ]
        );

        await conexao.commit();

        res.json({
            mensagem: "Ordem de serviço atualizada com sucesso!",
            id_os: id
        });
    } catch (erro) {
        if (conexao) {
            await conexao.rollback();
        }

        console.error("Erro ao atualizar ordem:", erro.message);

        res.status(500).json({
            erro: "Não foi possível atualizar a ordem de serviço."
        });
    } finally {
        if (conexao) {
            conexao.release();
        }
    }
});

app.delete("/api/ordens-servico/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: "ID da ordem de serviço inválido."
        });
    }

    try {
        const [resultado] = await db.query(
            "DELETE FROM ordens_servico WHERE id_os = ?",
            [id]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                erro: "Ordem de serviço não encontrada."
            });
        }

        res.json({
            mensagem: "Ordem de serviço excluída com sucesso!",
            id_os: id
        });
    } catch (erro) {
        console.error("Erro ao excluir ordem:", erro.message);

        res.status(500).json({
            erro: "Não foi possível excluir a ordem de serviço."
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});