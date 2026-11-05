// ======================================
// TECHFLOW - LISTA REAL DE CLIENTES
// ======================================

document.addEventListener("DOMContentLoaded", async () => {

    const lista = document.getElementById("lista-clientes");

    const token = sessionStorage.getItem("techflow_token");

    if (!lista || !token) {
        return;
    }

    // Remover os clientes demonstrativos
    lista.replaceChildren();

    try {

        // Consultar clientes cadastrados no MySQL
        const resposta = await fetch("/api/clientes", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            },
            cache: "no-store"
        });

        if (!resposta.ok) {
            throw new Error("Erro ao consultar clientes.");
        }

        const clientes = await resposta.json();

        if (!Array.isArray(clientes)) {
            throw new Error("Resposta inválida da API.");
        }

        // Mostrar mensagem quando não existir cliente
        if (clientes.length === 0) {

            const item = document.createElement("li");

            item.textContent = "Nenhum cliente cadastrado.";

            lista.appendChild(item);

            return;
        }

        // Criar a lista com os clientes reais
        clientes.forEach((cliente) => {

            const item = document.createElement("li");

            const nome = document.createElement("strong");

            const contato = document.createElement("span");

            // Nome real do cliente
            nome.textContent = cliente.nomeCompleto;

            // Telefone ou e-mail cadastrado
            contato.textContent =
                cliente.telefone || cliente.email || "Contato não informado";

            item.appendChild(nome);

            item.appendChild(contato);

            lista.appendChild(item);
        });

        console.log(
            `${clientes.length} cliente(s) carregado(s) do MySQL.`
        );

    } catch (erro) {

        console.error("Erro ao carregar clientes:", erro);

        lista.replaceChildren();

        const item = document.createElement("li");

        item.textContent =
            "Não foi possível carregar os clientes.";

        lista.appendChild(item);
    }

});