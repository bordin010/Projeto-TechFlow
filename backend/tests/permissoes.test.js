const request = require("supertest");
const jwt = require("jsonwebtoken");

// Simular o banco de dados nos testes
jest.mock("../database/conexao", () => ({
    execute: jest.fn()
}));

const conexao = require("../database/conexao");
const app = require("../server");

describe("Permissões de usuários - TechFlow", () => {

    beforeEach(() => {
        jest.resetAllMocks();
    });

    test("Cliente não pode acessar gerenciamento de técnicos", async () => {

        conexao.execute.mockResolvedValueOnce([
            [
                {
                    idUsuario: 100,
                    perfil: "cliente",
                    ativo: 1
                }
            ]
        ]);

        const token = jwt.sign(
            { idUsuario: 100 },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        const resposta = await request(app)
            .get("/api/tecnicos")
            .set("Authorization", `Bearer ${token}`);

        expect(resposta.status).toBe(403);
        expect(conexao.execute).toHaveBeenCalledTimes(1);
    });

    test("Administrador pode passar pela proteção da rota de técnicos", async () => {

        // Simular um administrador ativo no banco
        conexao.execute.mockResolvedValueOnce([
            [
                {
                    idUsuario: 101,
                    perfil: "administrador",
                    ativo: 1
                }
            ]
        ]);

        const token = jwt.sign(
            { idUsuario: 101 },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        // Testar somente os middlewares de autenticação e perfil.
        // Evitamos executar consultas da rota de técnicos.
        const verificarToken = require("../middlewares/verificarToken");
        const verificarPerfil = require("../middlewares/verificarPerfil");
        const express = require("express");

        const appTeste = express();

        appTeste.get(
            "/teste-admin",
            verificarToken,
            verificarPerfil("administrador"),
            (req, res) => {
                res.status(200).json({
                    mensagem: "Acesso autorizado.",
                    perfil: req.usuario.perfil
                });
            }
        );

        const resposta = await request(appTeste)
            .get("/teste-admin")
            .set("Authorization", `Bearer ${token}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body).toEqual({
            mensagem: "Acesso autorizado.",
            perfil: "administrador"
        });

        expect(conexao.execute).toHaveBeenCalledTimes(1);
    });

});