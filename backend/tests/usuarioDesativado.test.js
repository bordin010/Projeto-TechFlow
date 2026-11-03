const request = require("supertest");
const jwt = require("jsonwebtoken");

jest.mock("../database/conexao", () => ({
    execute: jest.fn()
}));

const conexao = require("../database/conexao");
const app = require("../server");

describe("Segurança - Usuários desativados", () => {

    beforeEach(() => {
        jest.resetAllMocks();
    });

    test("Deve bloquear usuário desativado mesmo com token válido", async () => {

        // Simular usuário desativado no banco de dados
        conexao.execute.mockResolvedValueOnce([
            [
                {
                    idUsuario: 200,
                    perfil: "cliente",
                    ativo: 0
                }
            ]
        ]);

        // Criar token JWT válido
        const token = jwt.sign(
            { idUsuario: 200 },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        const resposta = await request(app)
            .get("/api/equipamentos")
            .set("Authorization", `Bearer ${token}`);

        expect(resposta.status).toBe(403);

        expect(resposta.body).toEqual({
            mensagem: "Usuário inexistente ou desativado."
        });

        expect(conexao.execute).toHaveBeenCalledTimes(1);
    });

});