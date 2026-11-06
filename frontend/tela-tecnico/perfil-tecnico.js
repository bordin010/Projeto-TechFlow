// ==========================================
// TECHFLOW - PERFIL DO TÉCNICO
// Dados reais do usuário autenticado
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    const janelaPerfil = document.getElementById(
        "consulta-perfil"
    );

    const botaoPerfil = document.querySelector(
        '[popovertarget="consulta-perfil"]'
    );

    if (!janelaPerfil || !botaoPerfil) {
        return;
    }

    // ======================================
    // ATUALIZAR CAMPO DO PERFIL
    // ======================================

    function atualizarCampo(id, valor) {

        const elemento = document.getElementById(id);

        if (!elemento) {
            return;
        }

        elemento.textContent =
            valor === null ||
            valor === undefined ||
            String(valor).trim() === ""
                ? "Não informado"
                : String(valor);
    }

    // ======================================
    // CONSULTAR DADOS NO BACK-END
    // ======================================

    async function carregarPerfil() {

        const mensagem = document.getElementById(
            "perfil-mensagem"
        );

        if (mensagem) {
            mensagem.textContent = "Carregando perfil...";
        }

        const token = sessionStorage.getItem(
            "techflow_token"
        );

        if (!token) {

            if (mensagem) {
                mensagem.textContent =
                    "Sessão não encontrada. Faça login novamente.";
            }

            return;
        }

        try {

            const resposta = await fetch(
                "/api/auth/perfil",
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    cache: "no-store"
                }
            );

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.mensagem ||
                    "Não foi possível consultar o perfil."
                );
            }

            const usuario = dados.usuario;

            if (!usuario || usuario.perfil !== "tecnico") {
                throw new Error(
                    "Perfil de técnico não encontrado."
                );
            }

            // Exibir os dados reais
            atualizarCampo(
                "perfil-nome",
                usuario.nomeCompleto
            );

            atualizarCampo(
                "perfil-email",
                usuario.email
            );

            atualizarCampo(
                "perfil-telefone",
                usuario.telefone
            );

            atualizarCampo(
                "perfil-endereco",
                usuario.endereco
            );

            atualizarCampo(
                "perfil-tipo",
                "Técnico"
            );

            atualizarCampo(
                "perfil-situacao",
                usuario.ativo ? "Ativo" : "Inativo"
            );

            // Remover a descrição antiga que o
            // painel-servicos.js adicionava ao perfil
            janelaPerfil.querySelectorAll(
                ":scope > p"
            ).forEach((paragrafo) => {
                paragrafo.remove();
            });

            if (mensagem) {
                mensagem.textContent = "";
            }

        } catch (erro) {

            console.error(
                "Erro ao carregar perfil:",
                erro
            );

            if (mensagem) {
                mensagem.textContent =
                    "Erro ao carregar perfil: " +
                    erro.message;
            }
        }
    }

    // ======================================
    // CARREGAR AO ABRIR O PERFIL
    // ======================================

    botaoPerfil.addEventListener(
        "click",
        carregarPerfil
    );

});