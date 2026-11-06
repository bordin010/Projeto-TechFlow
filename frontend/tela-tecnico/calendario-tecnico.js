// ==========================================
// TECHFLOW - CALENDÁRIO DO TÉCNICO
// Agendamentos reais do MySQL
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    const janela = document.getElementById("consulta-agenda");

    if (!janela) {
        return;
    }

    const mensagem = document.createElement("p");
    mensagem.id = "mensagem-calendario";
    mensagem.setAttribute("role", "status");

    const lista = document.createElement("div");
    lista.id = "lista-calendario";

    // Remover somente a mensagem demonstrativa antiga
    janela.querySelectorAll(":scope > p").forEach((p) => {
        p.remove();
    });

    // Adicionar elementos à janela existente
    const botaoServicos = janela.querySelector(
        'a[href="#servicos"]'
    );

    if (botaoServicos) {
        botaoServicos.before(mensagem, lista);
    } else {
        janela.append(mensagem, lista);
    }

    // ======================================
    // FORMATAR DATA SEM ALTERAR O DIA
    // ======================================

    function formatarData(valor) {

        if (!valor) {
            return "Data não informada";
        }

        // MySQL pode retornar DATE como texto
        // ou como data em formato ISO.
        const texto = String(valor).slice(0, 10);

        const partes = texto.split("-");

        if (partes.length !== 3) {
            return "Data não informada";
        }

        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    // ======================================
    // FORMATAR HORÁRIO
    // ======================================

    function formatarHora(valor) {

        if (!valor) {
            return "Horário não informado";
        }

        return String(valor).slice(0, 5);
    }

    // ======================================
    // CRIAR CARTÃO DO AGENDAMENTO
    // ======================================

    function criarAgendamento(agendamento) {

        const artigo = document.createElement("article");
        artigo.className = "item-consulta";

        const titulo = document.createElement("strong");

        titulo.textContent =
            `OS #${agendamento.idOS} · ` +
            (agendamento.nomeCliente || "Cliente não informado");

        const data = document.createElement("p");

        data.textContent =
            `Data: ${formatarData(agendamento.dataAgendamento)} ` +
            `às ${formatarHora(agendamento.horaAgendamento)}`;

        const equipamento = document.createElement("p");

        equipamento.textContent = [
            agendamento.nomeEquipamento,
            agendamento.marcaEquipamento,
            agendamento.modeloEquipamento
        ].filter(Boolean).join(" ") || "Equipamento não informado";

        const status = document.createElement("p");

        status.textContent =
            `Situação: ${agendamento.statusOS || "Não informada"}`;

        artigo.appendChild(titulo);
        artigo.appendChild(data);
        artigo.appendChild(equipamento);
        artigo.appendChild(status);

        if (agendamento.observacao) {

            const observacao = document.createElement("p");

            observacao.textContent =
                `Observação: ${agendamento.observacao}`;

            artigo.appendChild(observacao);
        }

        return artigo;
    }

    // ======================================
    // CONSULTAR AGENDAMENTOS
    // ======================================

    async function carregarCalendario() {

        lista.replaceChildren();

        mensagem.textContent = "Carregando agendamentos...";

        const token = sessionStorage.getItem("techflow_token");

        if (!token) {
            mensagem.textContent =
                "Sessão não encontrada. Faça login novamente.";
            return;
        }

        try {

            const resposta = await fetch(
                "/api/agendamentos",
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
                    "Erro ao consultar agendamentos."
                );
            }

            if (!Array.isArray(dados)) {
                throw new Error(
                    "A API não retornou uma lista válida."
                );
            }

            mensagem.textContent =
                `${dados.length} agendamento(s) encontrado(s).`;

            if (dados.length === 0) {

                const aviso = document.createElement("p");

                aviso.textContent =
                    "Nenhum agendamento encontrado.";

                lista.appendChild(aviso);
                return;
            }

            dados.forEach((agendamento) => {
                lista.appendChild(
                    criarAgendamento(agendamento)
                );
            });

        } catch (erro) {

            console.error(
                "Erro ao carregar calendário:",
                erro
            );

            mensagem.textContent =
                `Não foi possível carregar os agendamentos: ${erro.message}`;
        }
    }

    // ======================================
    // ATUALIZAR AO ABRIR A JANELA
    // ======================================

    janela.addEventListener("toggle", (evento) => {

        if (evento.newState === "open") {
            carregarCalendario();
        }
    });

});