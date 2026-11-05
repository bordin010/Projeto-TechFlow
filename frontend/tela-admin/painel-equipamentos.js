// ======================================
// TECHFLOW - EQUIPAMENTOS REAIS
// ======================================

document.addEventListener("DOMContentLoaded", async () => {

    const lista = document.getElementById("lista-equipamentos");

    const token = sessionStorage.getItem("techflow_token");

    if (!lista || !token) {
        return;
    }

    // Remover equipamentos demonstrativos
    lista.replaceChildren();

    // Consultar uma rota protegida da API
    async function consultarAPI(caminho) {

        const resposta = await fetch(caminho, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            },
            cache: "no-store"
        });

        if (!resposta.ok) {
            throw new Error(
                `Erro ao consultar ${caminho}: ${resposta.status}`
            );
        }

        const dados = await resposta.json();

        if (!Array.isArray(dados)) {
            throw new Error("Resposta inválida da API.");
        }

        return dados;
    }

    try {

        // Consultar equipamentos, clientes e OS
        const [equipamentos, clientes, ordens] = await Promise.all([
            consultarAPI("/api/equipamentos"),
            consultarAPI("/api/clientes"),
            consultarAPI("/api/ordens-servico")
        ]);

        // Associar o ID de cada cliente ao nome
        const nomesClientes = new Map(
            clientes.map((cliente) => [
                String(cliente.idUsuario),
                cliente.nomeCompleto
            ])
        );

        // Encontrar a OS mais recente de cada equipamento
        const ordensPorEquipamento = new Map();

        ordens.forEach((os) => {

            const chave = String(os.idEquipamento);

            const ordemAnterior = ordensPorEquipamento.get(chave);

            if (
                !ordemAnterior ||
                Number(os.idOS) > Number(ordemAnterior.idOS)
            ) {
                ordensPorEquipamento.set(chave, os);
            }
        });

        // Mensagem para lista vazia
        if (equipamentos.length === 0) {

            const item = document.createElement("li");

            item.textContent = "Nenhum equipamento cadastrado.";

            lista.appendChild(item);

            return;
        }

        // Mostrar cada equipamento cadastrado
        equipamentos.forEach((equipamento) => {

            const item = document.createElement("li");

            const nome = document.createElement("strong");

            const informacoes = document.createElement("span");

            // Nome, marca e modelo do equipamento
            const identificacao = [
                equipamento.nomeEquipamento,
                equipamento.marca,
                equipamento.modelo
            ].filter(Boolean).join(" · ");

            nome.textContent =
                identificacao || "Equipamento sem nome";

            // Nome do cliente responsável
            const nomeCliente = nomesClientes.get(
                String(equipamento.idCliente)
            ) || `Cliente #${equipamento.idCliente}`;

            // Buscar uma OS associada ao equipamento
            const ordem = ordensPorEquipamento.get(
                String(equipamento.idEquipamento)
            );

            const numeroOS = ordem
                ? `OS #${ordem.idOS}`
                : "Sem OS vinculada";

            informacoes.textContent =
                `${numeroOS} · ${nomeCliente}`;

            item.appendChild(nome);

            item.appendChild(informacoes);

            lista.appendChild(item);
        });

        console.log(
            `${equipamentos.length} equipamento(s) carregado(s) do MySQL.`
        );

    } catch (erro) {

        console.error(
            "Erro ao carregar equipamentos:",
            erro
        );

        lista.replaceChildren();

        const item = document.createElement("li");

        item.textContent =
            "Não foi possível carregar os equipamentos.";

        lista.appendChild(item);
    }

});