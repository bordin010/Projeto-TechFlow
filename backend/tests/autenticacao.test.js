const request = require("supertest");
const app = require("../server");

describe("Segurança e autenticação da API TechFlow", () => {

    test("Deve bloquear acesso aos técnicos sem token", async () => {
        const resposta = await request(app)
            .get("/api/tecnicos");

        expect(resposta.status).toBe(401);
    });

    test("Deve bloquear acesso aos equipamentos sem token", async () => {
        const resposta = await request(app)
            .get("/api/equipamentos");

        expect(resposta.status).toBe(401);
    });

    test("Deve bloquear acesso às categorias sem token", async () => {
        const resposta = await request(app)
            .get("/api/categorias");

        expect(resposta.status).toBe(401);
    });

    test("Deve bloquear acesso aos tipos de serviço sem token", async () => {
        const resposta = await request(app)
            .get("/api/tipos-servico");

        expect(resposta.status).toBe(401);
    });

    test("Deve bloquear token JWT inválido", async () => {
        const resposta = await request(app)
            .get("/api/equipamentos")
            .set("Authorization", "Bearer token-invalido");

        expect(resposta.status).toBe(401);
    });

});