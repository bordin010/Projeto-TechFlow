// ==========================================
// TECHFLOW - LOGÍSTICA DO TÉCNICO
// Consultar endereços reais das OS
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    const janela = document.getElementById("consulta-logistica");

    if (!janela) {
        return;
    }

    const mensagem = document.createElement("p");
    mensagem.id = "mensagem-logistica";
    mensagem.setAttribute("role", "status");

    const lista = document.createElement("div");
    lista.id = "lista-logistica";

    // Remover os registros demonstrativos antigos
    janela.querySelectorAll(".item-consulta").forEach(
        (item) => item.remove()
    );

    // Remover o aviso anterior de integração futura
    janela.querySelectorAll("[data-aviso-logistica]").forEach(
        (item) => item.remove()
    );

    janela.appendChild(mensagem);
    janela.appendChild(lista);

    // ======================================
    // CRIAR ITEM DE ATENDIMENTO
    // ======================================

    function criarItem(os) {

        const artigo = document.createElement("article");
        artigo.className = "item-consulta";

        const titulo = document.createElement("strong");

        titulo.textContent =
            `OS #${os.idOS} · ` +
            (os.nomeCliente || `Cliente #${os.idCliente}`);

        const equipamento = document.createElement("p");

        equipamento.textContent = [
            os.nomeEquipamento,
            os.marcaEquipamento,
            os.modeloEquipamento
        ].filter(Boolean).join(" ") || "Equipamento não informado";

        const endereco = document.createElement("p");

        endereco.textContent =
            `Endereço cadastral: ${os.enderecoCliente || "Não informado"}`;

        const status = document.createElement("p");

        status.textContent =
            `Situação: ${os.statusOS || "Não informada"}`;

        artigo.appendChild(titulo);
        artigo.appendChild(equipamento);
        artigo.appendChild(endereco);
        artigo.appendChild(status);

        return artigo;
    }

    // ======================================
    // CARREGAR LOGÍSTICA DO MYSQL
    // ======================================

    async function carregarLogistica() {

        const token = sessionStorage.getItem("techflow_token");

        lista.replaceChildren();
        mensagem.textContent = "Carregando atendimentos...";

        if (!token) {
            mensagem.textContent =
                "Sessão não encontrada. Faça login novamente.";
            return;
        }

        try {

            const resposta = await fetch(
                "/api/ordens-servico",
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
                    "Erro ao consultar os atendimentos."
                );
            }

            if (!Array.isArray(dados)) {
                throw new Error(
                    "A API não retornou uma lista válida."
                );
            }

            // Exibir as OS que ainda exigem atendimento
            const pendentes = dados.filter((os) =>
                !["Concluída", "Cancelada"].includes(os.statusOS)
            );

            mensagem.textContent =
                `${pendentes.length} atendimento(s) pendente(s).`;

            if (pendentes.length === 0) {

                const aviso = document.createElement("p");
                aviso.textContent =
                    "Nenhum atendimento pendente no momento.";

                lista.appendChild(aviso);
                return;
            }

            pendentes.forEach((os) => {
                lista.appendChild(criarItem(os));
            });

        } catch (erro) {

            console.error("Erro na logística:", erro);

            mensagem.textContent =
                `Não foi possível carregar os atendimentos: ${erro.message}`;
        }
    }

    // Carregar sempre que a janela for aberta
    janela.addEventListener("toggle", (evento) => {

        if (evento.newState === "open") {
            carregarLogistica();
        }
    });

});