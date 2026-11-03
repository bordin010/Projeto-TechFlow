require("dotenv").config({ quiet: true });

const express = require("express");

const clientesRoutes = require("./routes/clientes");
const tecnicosRoutes = require("./routes/tecnicos");
const ordensServicoRoutes = require("./routes/ordensServico");
const autenticacaoRoutes = require("./routes/autenticacao");
const atribuicoesRoutes = require("./routes/atribuicoes");
const historicoOSRoutes = require("./routes/historicoOS");
const equipamentosRoutes = require("./routes/equipamentos");
const categoriasRoutes = require("./routes/categorias");
const tiposServicoRoutes = require("./routes/tiposServico");

const verificarToken = require("./middlewares/verificarToken");
const verificarPerfil = require("./middlewares/verificarPerfil");

const app = express();
const PORT = 3000;

// Receber dados em formato JSON
app.use(express.json());

// Rota inicial
app.get("/", (req, res) => {
    res.json({
        mensagem: "API do TechFlow funcionando!"
    });
});

// Login público
app.use("/api/auth", autenticacaoRoutes);

// Gerenciamento de técnicos: somente administrador
app.use(
    "/api/tecnicos",
    verificarToken,
    verificarPerfil("administrador"),
    tecnicosRoutes
);

// Atribuição de técnicos às Ordens de Serviço
// A autorização é verificada na rota específica
app.use(
    "/api/ordens-servico",
    atribuicoesRoutes
);

// Histórico das Ordens de Serviço
app.use(
    "/api/ordens-servico",
    historicoOSRoutes
);

// Gerenciamento das Ordens de Serviço
app.use(
    "/api/ordens-servico",
    verificarToken,
    ordensServicoRoutes
);

// Gerenciamento de equipamentos
app.use(
    "/api/equipamentos",
    verificarToken,
    equipamentosRoutes
);

// Gerenciamento de categorias
app.use(
    "/api/categorias",
    verificarToken,
    categoriasRoutes
);

// Gerenciamento de tipos de serviço
app.use(
    "/api/tipos-servico",
    verificarToken,
    tiposServicoRoutes
);

// Cadastro público e gerenciamento de clientes
app.use(
    "/api/clientes",
    (req, res, next) => {
        // Permitir cadastro público
        if (req.method === "POST" && req.path === "/") {
            return next();
        }

        verificarToken(req, res, next);
    },
    (req, res, next) => {
        // Listar clientes: somente administrador
        if (req.method === "GET" && req.path === "/") {
            return verificarPerfil("administrador")(req, res, next);
        }

        // Desativar e reativar clientes: somente administrador
        if (
            req.method === "PATCH" &&
            /^\/\d+\/(desativar|reativar)\/?$/.test(req.path)
        ) {
            return verificarPerfil("administrador")(req, res, next);
        }

        // Consultar e atualizar um cliente
        if (
            ["GET", "PUT"].includes(req.method) &&
            /^\/\d+\/?$/.test(req.path)
        ) {
            const idCliente = Number(req.path.split("/")[1]);

            if (
                req.usuario.perfil === "administrador" ||
                (
                    req.usuario.perfil === "cliente" &&
                    Number(req.usuario.idUsuario) === idCliente
                )
            ) {
                return next();
            }

            return res.status(403).json({
                mensagem: "Você não tem permissão para acessar este cliente."
            });
        }

        next();
    },
    clientesRoutes
);

// Rota não encontrada
app.use((req, res) => {
    res.status(404).json({
        mensagem: "Rota não encontrada."
    });
});

// Tratamento de erros
app.use((erro, req, res, next) => {
    console.error("Erro no servidor:", erro.message);

    if (
        erro instanceof SyntaxError &&
        erro.status === 400 &&
        "body" in erro
    ) {
        return res.status(400).json({
            mensagem: "JSON inválido."
        });
    }

    res.status(500).json({
        mensagem: "Erro interno do servidor."
    });
});

// Iniciar servidor somente quando executado diretamente
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(
            `Servidor rodando em http://localhost:${PORT}`
        );
    });
}

// Disponibilizar o Express para os testes automatizados
module.exports = app;