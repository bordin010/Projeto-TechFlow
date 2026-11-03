const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../database/conexao", () => ({
    execute: jest.fn()
}));

const conexao = require("../database/conexao");
const app = require("../server");

describe("Segurança - Token JWT expirado", () => {

    beforeEach(() => {
        jest.resetAllMocks();
    });

    test("Deve bloquear acesso com token expirado", async () => {

        // Criar token que já expirou
        const token = jwt.sign(
            { idUsuario: 300 },
            process.env.JWT_SECRET,
            { expiresIn: -10 }
        );

        const resposta = await request(app)
            .get("/api/equipamentos")
            .set("Authorization", `Bearer ${token}`);

        expect(resposta.status).toBe(401);

        expect(resposta.body).toEqual({
            mensagem: "Token expirado. Faça login novamente."
        });

        // Token expirado deve ser rejeitado antes da consulta ao banco
        expect(conexao.execute).not.toHaveBeenCalled();
    });

});