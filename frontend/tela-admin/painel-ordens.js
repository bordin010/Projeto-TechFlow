// =============================================
// TECHFLOW - ORDENS DE SERVIÇO DO ADMINISTRADOR
// =============================================

// Consultar OS, clientes e técnicos diretamente da API

document.addEventListener("DOMContentLoaded", () => {

    // Elementos do painel
    const tabela = document.getElementById("lista-ordens");
    const recentes = document.getElementById("ordens-recentes");
    const mensagem = document.getElementById("mensagem");
    const filtro = document.getElementById("filtro-status");

    // Dados recebidos do backend
    let todasOrdens = [];

    // Relacionar IDs com nomes
    let nomesClientes = new Map();
    let nomesTecnicos = new Map();

    // =============================================
    // CONSULTAR UMA ROTA DA API
    // =============================================

    async function consultarAPI(caminho, token) {

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
            throw new Error(
                `A rota ${caminho} não retornou uma lista.`
            );
        }

        return dados;
    }

    // =============================================
    // IDENTIFICAR STATUS
    // =============================================

    function classeStatus(status) {

        if (status === "Concluída") {
            return "concluida";
        }

        if (
            status === "Em andamento" ||
            status === "Aguardando peça"
        ) {
            return "andamento";
        }

        return "pendente";
    }

    // =============================================
    // NOME DO CLIENTE
    // =============================================

    function obterNomeCliente(idCliente) {

        if (idCliente == null) {
            return "Não informado";
        }

        return nomesClientes.get(String(idCliente)) ||
            `Cliente #${idCliente}`;
    }

    // =============================================
    // NOME DO TÉCNICO
    // =============================================

    function obterNomeTecnico(idTecnico) {

        if (idTecnico == null) {
            return "Não atribuído";
        }

        return nomesTecnicos.get(String(idTecnico)) ||
            `Técnico #${idTecnico}`;
    }

    // =============================================
    // CRIAR CÉLULA COM SEGURANÇA
    // =============================================

    function criarCelula(linha, conteudo) {

        const celula = document.createElement("td");

        celula.textContent = conteudo;

        linha.appendChild(celula);

        return celula;
    }

    // =============================================
    // ADICIONAR STATUS NA TABELA
    // =============================================

    function adicionarStatus(linha, status) {

        const celula = document.createElement("td");

        const etiqueta = document.createElement("span");

        etiqueta.className =
            `situacao ${classeStatus(status)}`;

        etiqueta.textContent =
            status || "Não informado";

        celula.appendChild(etiqueta);

        linha.appendChild(celula);
    }

    // =============================================
    // MOSTRAR DETALHES DA OS
    // =============================================

    function mostrarDetalhes(os) {

        const detalhes = [
            `Ordem de Serviço #${os.idOS}`,
            "",
            `Cliente: ${obterNomeCliente(os.idCliente)}`,
            `Equipamento: #${os.idEquipamento ?? "Não informado"}`,
            `Técnico: ${obterNomeTecnico(os.idTecnico)}`,
            `Status: ${os.statusOS ?? "Não informado"}`,
            "",
            `Problema: ${os.descricaoProblema ?? "Não informado"}`
        ];

        alert(detalhes.join("\n"));
    }

    // =============================================
    // ATUALIZAR TABELA PRINCIPAL
    // =============================================

    function atualizarTabela() {

        if (!tabela) {
            return;
        }

        tabela.replaceChildren();

        const statusSelecionado = filtro
            ? filtro.value
            : "todos";

        const ordensFiltradas = todasOrdens.filter((os) => {

            const classe = classeStatus(os.statusOS);

            return (
                statusSelecionado === "todos" ||
                classe === statusSelecionado
            );
        });

        // Nenhuma ordem encontrada
        if (ordensFiltradas.length === 0) {

            const linha = document.createElement("tr");

            const celula = document.createElement("td");

            celula.colSpan = 6;

            celula.textContent =
                "Nenhuma ordem de serviço encontrada.";

            linha.appendChild(celula);

            tabela.appendChild(linha);
        }

        // Construir linhas da tabela
        ordensFiltradas.forEach((os) => {

            const linha = document.createElement("tr");

            linha.className =
                `linha-os ${classeStatus(os.statusOS)}`;

            // Número da OS
            criarCelula(linha, `#${os.idOS}`);

            // Nome real do cliente
            criarCelula(
                linha,
                obterNomeCliente(os.idCliente)
            );

            // Descrição do problema
            criarCelula(
                linha,
                os.descricaoProblema || "Não informado"
            );

            // Nome real do técnico
            criarCelula(
                linha,
                obterNomeTecnico(os.idTecnico)
            );

            // Status
            adicionarStatus(linha, os.statusOS);

            // Botão de detalhes
            const celulaAcao = document.createElement("td");

            const botao = document.createElement("button");

            botao.type = "button";

            botao.className = "botao-detalhes";

            botao.textContent = "Detalhes";

            botao.addEventListener("click", () => {
                mostrarDetalhes(os);
            });

            celulaAcao.appendChild(botao);

            linha.appendChild(celulaAcao);

            tabela.appendChild(linha);
        });

        // Atualizar mensagem de quantidade
        if (mensagem) {

            mensagem.textContent =
                `${ordensFiltradas.length} ordem(ns) encontrada(s).`;
        }
    }

    // =============================================
    // ATUALIZAR ORDENS RECENTES
    // =============================================

    function atualizarRecentes() {

        if (!recentes) {
            return;
        }

        recentes.replaceChildren();

        // A API já retorna as ordens por ID decrescente
        const ultimasOrdens = todasOrdens.slice(0, 3);

        if (ultimasOrdens.length === 0) {

            const linha = document.createElement("tr");

            const celula = document.createElement("td");

            celula.colSpan = 3;

            celula.textContent =
                "Nenhuma ordem registrada.";

            linha.appendChild(celula);

            recentes.appendChild(linha);

            return;
        }

        ultimasOrdens.forEach((os) => {

            const linha = document.createElement("tr");

            // Número da OS
            criarCelula(linha, `#${os.idOS}`);

            // Nome do cliente
            criarCelula(
                linha,
                obterNomeCliente(os.idCliente)
            );

            // Status da OS
            adicionarStatus(linha, os.statusOS);

            recentes.appendChild(linha);
        });
    }

    // =============================================
    // CARREGAR DADOS REAIS
    // =============================================

    async function carregarDados() {

        const token =
            sessionStorage.getItem("techflow_token");

        if (!token) {
            return;
        }

        try {

            if (mensagem) {
                mensagem.textContent =
                    "Carregando ordens de serviço...";
            }

            // Consultar as três rotas
            const [
                ordens,
                clientes,
                tecnicos
            ] = await Promise.all([

                consultarAPI(
                    "/api/ordens-servico",
                    token
                ),

                consultarAPI(
                    "/api/clientes",
                    token
                ),

                consultarAPI(
                    "/api/tecnicos",
                    token
                )
            ]);

            // Guardar as ordens recebidas
            todasOrdens = ordens;

            // Criar relacionamento entre ID e nome do cliente
            nomesClientes = new Map(
                clientes.map((cliente) => [
                    String(cliente.idUsuario),
                    cliente.nomeCompleto
                ])
            );

            // Criar relacionamento entre ID e nome do técnico
            nomesTecnicos = new Map(
                tecnicos.map((tecnico) => [
                    String(tecnico.idUsuario),
                    tecnico.nomeCompleto
                ])
            );

            // Atualizar as tabelas
            atualizarTabela();

            atualizarRecentes();

            console.log(
                "Ordens, clientes e técnicos carregados com sucesso!"
            );

        } catch (erro) {

            console.error(
                "Erro ao carregar dados do painel:",
                erro
            );

            if (mensagem) {
                mensagem.textContent =
                    "Não foi possível carregar as ordens de serviço.";
            }

            // Não manter os registros demonstrativos
            if (tabela) {
                tabela.replaceChildren();
            }

            if (recentes) {
                recentes.replaceChildren();
            }
        }
    }

    // =============================================
    // FILTRO DE STATUS
    // =============================================

    if (filtro) {

        filtro.addEventListener(
            "change",
            atualizarTabela
        );
    }

    // =============================================
    // INICIAR CONSULTA
    // =============================================

    carregarDados();

});