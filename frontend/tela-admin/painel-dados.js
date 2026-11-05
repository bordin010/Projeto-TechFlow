// TechFlow - Indicadores reais do painel administrativo

document.addEventListener("DOMContentLoaded", async () => {

    // Recuperar o token do administrador
    const token = sessionStorage.getItem("techflow_token");

    if (!token) {
        return;
    }

    // Elementos do painel
    const total = document.getElementById("total");
    const pendentes = document.getElementById("pendentes");
    const concluidas = document.getElementById("concluidas");
    const percentual = document.getElementById("percentual-conclusao");
    const progresso = document.getElementById("progresso-conclusao");
    const resumo = document.getElementById("resumo-andamento");

    try {

        // Consultar as ordens no banco através da API
        const resposta = await fetch("/api/ordens-servico", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            },
            cache: "no-store"
        });

        if (!resposta.ok) {
            throw new Error("Não foi possível consultar as ordens.");
        }

        const ordens = await resposta.json();

        if (!Array.isArray(ordens)) {
            throw new Error("Resposta inválida da API.");
        }

        // Total de ordens cadastradas
        const quantidadeTotal = ordens.length;

        // Ordens aguardando atendimento
        const quantidadePendentes = ordens.filter((os) =>
            ["Aberta", "Em análise"].includes(os.statusOS)
        ).length;

        // Ordens concluídas
        const quantidadeConcluidas = ordens.filter((os) =>
            os.statusOS === "Concluída"
        ).length;

        // Ordens em atendimento ou aguardando peças
        const quantidadeAndamento = ordens.filter((os) =>
            ["Em andamento", "Aguardando peça"].includes(os.statusOS)
        ).length;

        // Calcular percentual de conclusão
        const porcentagem = quantidadeTotal > 0
            ? Math.round((quantidadeConcluidas / quantidadeTotal) * 100)
            : 0;

        // Atualizar os indicadores da tela
        if (total) {
            total.textContent = quantidadeTotal;
        }

        if (pendentes) {
            pendentes.textContent = quantidadePendentes;
        }

        if (concluidas) {
            concluidas.textContent = quantidadeConcluidas;
        }

        if (percentual) {
            percentual.textContent = `${porcentagem}%`;
        }

        if (progresso) {
            progresso.value = porcentagem;
        }

        if (resumo) {
            resumo.textContent =
                `${quantidadeAndamento} atendimento(s) em andamento ou aguardando peça.`;
        }

        console.log("Indicadores do TechFlow atualizados!");

    } catch (erro) {

        console.error("Erro ao carregar indicadores:", erro);

        if (resumo) {
            resumo.textContent =
                "Não foi possível carregar os indicadores do sistema.";
        }
    }

});