const request = require("supertest");
const app = require("../server");

describe("API TechFlow", () => {

    // TESTE 1 - Verificar se a API responde
    test("Deve retornar a mensagem inicial da API", async () => {
        const resposta = await request(app)
            .get("/");

        expect(resposta.status).toBe(200);

        expect(resposta.body).toEqual({
            mensagem: "API do TechFlow funcionando!"
        });
    });

    // TESTE 2 - Verificar rota inexistente
    test("Deve retornar erro 404 para rota inexistente", async () => {
        const resposta = await request(app)
            .get("/rota-inexistente");

        expect(resposta.status).toBe(404);

        expect(resposta.body).toEqual({
            mensagem: "Rota não encontrada."
        });
    });

    // TESTE 3 - Impedir acesso sem token JWT
    test("Deve bloquear acesso às OS sem autenticação", async () => {
        const resposta = await request(app)
            .get("/api/ordens-servico");

        expect(resposta.status).toBe(401);

        expect(resposta.body).toEqual({
            mensagem: "Token de autenticação não informado."
        });
    });

});