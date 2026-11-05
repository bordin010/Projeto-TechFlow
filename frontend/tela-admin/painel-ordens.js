// ======================================
// TECHFLOW - GERENCIAMENTO DE ORDENS
// Listagem, atribuição, status,
// diagnóstico e histórico de alterações
// ======================================

document.addEventListener("DOMContentLoaded", () => {

    // ======================================
    // ELEMENTOS DO PAINEL
    // ======================================

    const tabela = document.getElementById("lista-ordens");
    const recentes = document.getElementById("ordens-recentes");
    const mensagem = document.getElementById("mensagem");
    const filtro = document.getElementById("filtro-status");

    const token = sessionStorage.getItem("techflow_token");

    if (!tabela || !recentes || !mensagem || !filtro || !token) {
        return;
    }

    let todasOrdens = [];
    let nomesClientes = new Map();
    let nomesTecnicos = new Map();
    let tecnicosAtivos = [];

    // ======================================
    // CONSULTAR API
    // ======================================

    async function consultarAPI(caminho, metodo = "GET", corpo = null) {

        const opcoes = {
            method: metodo,
            headers: {
                Authorization: `Bearer ${token}`
            },
            cache: "no-store"
        };

        if (corpo !== null) {
            opcoes.headers["Content-Type"] = "application/json";
            opcoes.body = JSON.stringify(corpo);
        }

        const resposta = await fetch(caminho, opcoes);
        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.mensagem || `Erro na API: ${resposta.status}`
            );
        }

        return dados;
    }

    // ======================================
    // FUNÇÕES AUXILIARES
    // ======================================

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

    function osFinalizada(os) {
        return ["Concluída", "Cancelada"].includes(os.statusOS);
    }

    function obterNomeCliente(id) {

        if (id == null) {
            return "Não informado";
        }

        return nomesClientes.get(String(id)) || `Cliente #${id}`;
    }

    function obterNomeTecnico(id) {

        if (id == null) {
            return "Não atribuído";
        }

        return nomesTecnicos.get(String(id)) || `Técnico #${id}`;
    }

    function criarCelula(linha, texto) {

        const celula = document.createElement("td");
        celula.textContent = texto ?? "Não informado";

        linha.appendChild(celula);

        return celula;
    }

    function adicionarStatus(linha, status) {

        const celula = document.createElement("td");
        const etiqueta = document.createElement("span");

        etiqueta.className = `situacao ${classeStatus(status)}`;
        etiqueta.textContent = status || "Não informado";

        celula.appendChild(etiqueta);
        linha.appendChild(celula);
    }

    function criarBotao(texto, acao) {

        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "botao-detalhes";
        botao.textContent = texto;

        botao.addEventListener("click", acao);

        return botao;
    }

    function formatarData(data) {

        if (!data) {
            return "Data não informada";
        }

        // Datas SQL sem fuso são interpretadas como locais.
        const texto = String(data);
        const dataConvertida = new Date(
            texto.includes("T")
                ? texto
                : texto.replace(" ", "T")
        );

        if (Number.isNaN(dataConvertida.getTime())) {
            return texto;
        }

        return dataConvertida.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    // ======================================
    // MOSTRAR DETALHES
    // ======================================

    function mostrarDetalhes(os) {

        alert([
            `Ordem de Serviço #${os.idOS}`,
            "",
            `Cliente: ${obterNomeCliente(os.idCliente)}`,
            `Equipamento: #${os.idEquipamento ?? "Não informado"}`,
            `Técnico: ${obterNomeTecnico(os.idTecnico)}`,
            `Status: ${os.statusOS || "Não informado"}`,
            "",
            `Problema: ${os.descricaoProblema || "Não informado"}`,
            "",
            `Diagnóstico: ${os.diagnostico || "Não informado"}`,
            `Solução: ${os.solucaoAplicada || "Não informada"}`
        ].join("\n"));
    }

    // ======================================
    // JANELA PADRÃO COM SELEÇÃO
    // ======================================

    function criarJanelaSelecao(id, tituloTexto, textoCampo, textoSalvar) {

        const janela = document.createElement("dialog");
        janela.id = id;

        const titulo = document.createElement("h2");
        titulo.textContent = tituloTexto;

        const descricao = document.createElement("p");

        const formulario = document.createElement("form");

        const label = document.createElement("label");
        label.textContent = textoCampo;

        const selecionar = document.createElement("select");
        selecionar.id = `${id}-selecao`;
        selecionar.required = true;

        label.htmlFor = selecionar.id;

        const acoes = document.createElement("div");
        acoes.className = "acoes-editor";

        const cancelar = criarBotao("Cancelar", () => janela.close());

        const salvar = document.createElement("button");
        salvar.type = "submit";
        salvar.className = "botao";
        salvar.textContent = textoSalvar;

        acoes.appendChild(cancelar);
        acoes.appendChild(salvar);

        formulario.appendChild(label);
        formulario.appendChild(selecionar);
        formulario.appendChild(acoes);

        janela.appendChild(titulo);
        janela.appendChild(descricao);
        janela.appendChild(formulario);

        document.body.appendChild(janela);

        return {
            janela,
            titulo,
            descricao,
            formulario,
            selecionar,
            salvar
        };
    }

    function adicionarOpcao(select, valor, texto) {

        const opcao = document.createElement("option");

        opcao.value = valor;
        opcao.textContent = texto;

        select.appendChild(opcao);

        return opcao;
    }

    // ======================================
    // ATRIBUIÇÃO DE TÉCNICOS
    // ======================================

    const atribuicao = criarJanelaSelecao(
        "janela-atribuir-tecnico",
        "Atribuir técnico",
        "Técnico responsável",
        "Salvar atribuição"
    );

    let ordemAtribuicao = null;

    function abrirAtribuicao(os) {

        if (osFinalizada(os)) {
            mensagem.textContent = "Esta OS já está finalizada.";
            return;
        }

        if (tecnicosAtivos.length === 0) {
            mensagem.textContent = "Nenhum técnico ativo disponível.";
            return;
        }

        ordemAtribuicao = os;

        atribuicao.titulo.textContent = os.idTecnico == null
            ? "Atribuir técnico"
            : "Alterar técnico responsável";

        atribuicao.descricao.textContent =
            `OS #${os.idOS} - ${obterNomeCliente(os.idCliente)}`;

        atribuicao.selecionar.replaceChildren();

        const inicial = adicionarOpcao(
            atribuicao.selecionar,
            "",
            "Selecione um técnico"
        );
        inicial.disabled = true;

        tecnicosAtivos.forEach((tecnico) => {

            adicionarOpcao(
                atribuicao.selecionar,
                String(tecnico.idUsuario),
                tecnico.nomeCompleto
            );
        });

        const atualAtivo = tecnicosAtivos.some(
            tecnico =>
                String(tecnico.idUsuario) === String(os.idTecnico)
        );

        atribuicao.selecionar.value = atualAtivo
            ? String(os.idTecnico)
            : "";

        atribuicao.janela.showModal();
    }

    atribuicao.formulario.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        if (!ordemAtribuicao) {
            return;
        }

        const idTecnico = Number(atribuicao.selecionar.value);

        if (!Number.isSafeInteger(idTecnico) || idTecnico <= 0) {
            alert("Selecione um técnico válido.");
            return;
        }

        if (Number(ordemAtribuicao.idTecnico) === idTecnico) {
            alert("Este técnico já está atribuído à OS.");
            return;
        }

        atribuicao.salvar.disabled = true;
        atribuicao.salvar.textContent = "Salvando...";

        try {

            const idOS = ordemAtribuicao.idOS;

            await consultarAPI(
                `/api/ordens-servico/${idOS}/atribuir`,
                "PATCH",
                { idTecnico }
            );

            atribuicao.janela.close();

            await carregarDados();

            mensagem.textContent =
                `Técnico atribuído com sucesso à OS #${idOS}!`;

        } catch (erro) {

            console.error("Erro ao atribuir técnico:", erro);
            alert(erro.message);

        } finally {

            atribuicao.salvar.disabled = false;
            atribuicao.salvar.textContent = "Salvar atribuição";
        }
    });

    // ======================================
    // ALTERAÇÃO DE STATUS
    // ======================================

    const statusJanela = criarJanelaSelecao(
        "janela-alterar-status",
        "Alterar status da OS",
        "Novo status",
        "Salvar status"
    );

    let ordemStatus = null;

    function abrirAlteracaoStatus(os) {

        if (osFinalizada(os)) {
            mensagem.textContent = "Esta OS já está finalizada.";
            return;
        }

        ordemStatus = os;

        statusJanela.descricao.textContent =
            `OS #${os.idOS} - Status atual: ${os.statusOS}`;

        statusJanela.selecionar.replaceChildren();

        const inicial = adicionarOpcao(
            statusJanela.selecionar,
            "",
            "Selecione o novo status"
        );
        inicial.disabled = true;

        const statusPermitidos = [
            "Em análise",
            "Em andamento",
            "Aguardando peça"
        ];

        const possuiDiagnostico =
            typeof os.diagnostico === "string" &&
            os.diagnostico.trim().length > 0;

        const possuiSolucao =
            typeof os.solucaoAplicada === "string" &&
            os.solucaoAplicada.trim().length > 0;

        if (possuiDiagnostico && possuiSolucao) {
            statusPermitidos.push("Concluída");
        }

        statusPermitidos.forEach((status) => {

            if (status !== os.statusOS) {
                adicionarOpcao(
                    statusJanela.selecionar,
                    status,
                    status
                );
            }
        });

        statusJanela.selecionar.value = "";
        statusJanela.janela.showModal();
    }

    statusJanela.formulario.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        if (!ordemStatus) {
            return;
        }

        const novoStatus = statusJanela.selecionar.value;

        if (!novoStatus || novoStatus === ordemStatus.statusOS) {
            alert("Selecione um novo status válido.");
            return;
        }

        statusJanela.salvar.disabled = true;
        statusJanela.salvar.textContent = "Salvando...";

        try {

            const idOS = ordemStatus.idOS;

            await consultarAPI(
                `/api/ordens-servico/${idOS}/status`,
                "PATCH",
                { novoStatus }
            );

            statusJanela.janela.close();

            await carregarDados();

            mensagem.textContent =
                `Status da OS #${idOS} atualizado para ${novoStatus}!`;

        } catch (erro) {

            console.error("Erro ao alterar status:", erro);
            alert(erro.message);

        } finally {

            statusJanela.salvar.disabled = false;
            statusJanela.salvar.textContent = "Salvar status";
        }
    });

    // ======================================
    // DIAGNÓSTICO E SOLUÇÃO
    // ======================================

    const janelaDiagnostico = document.createElement("dialog");
    janelaDiagnostico.id = "janela-diagnostico";

    const tituloDiagnostico = document.createElement("h2");
    tituloDiagnostico.textContent = "Registrar diagnóstico e solução";

    const descricaoDiagnostico = document.createElement("p");
    const formularioDiagnostico = document.createElement("form");

    function criarCampoTexto(id, rotulo, placeholder) {

        const label = document.createElement("label");
        label.htmlFor = id;
        label.textContent = rotulo;

        const campo = document.createElement("textarea");
        campo.id = id;
        campo.rows = 4;
        campo.required = true;
        campo.placeholder = placeholder;

        formularioDiagnostico.appendChild(label);
        formularioDiagnostico.appendChild(campo);

        return campo;
    }

    const campoDiagnostico = criarCampoTexto(
        "campo-diagnostico",
        "Diagnóstico do equipamento",
        "Descreva o problema identificado."
    );

    const campoSolucao = criarCampoTexto(
        "campo-solucao",
        "Solução aplicada",
        "Descreva os procedimentos realizados."
    );

    const acoesDiagnostico = document.createElement("div");
    acoesDiagnostico.className = "acoes-editor";

    const cancelarDiagnostico = criarBotao(
        "Cancelar",
        () => janelaDiagnostico.close()
    );

    const salvarDiagnostico = document.createElement("button");
    salvarDiagnostico.type = "submit";
    salvarDiagnostico.className = "botao";
    salvarDiagnostico.textContent = "Salvar diagnóstico";

    acoesDiagnostico.appendChild(cancelarDiagnostico);
    acoesDiagnostico.appendChild(salvarDiagnostico);

    formularioDiagnostico.appendChild(acoesDiagnostico);

    janelaDiagnostico.appendChild(tituloDiagnostico);
    janelaDiagnostico.appendChild(descricaoDiagnostico);
    janelaDiagnostico.appendChild(formularioDiagnostico);

    document.body.appendChild(janelaDiagnostico);

    let ordemDiagnostico = null;

    function abrirDiagnostico(os) {

        if (osFinalizada(os)) {
            mensagem.textContent = "Esta OS já está finalizada.";
            return;
        }

        ordemDiagnostico = os;

        descricaoDiagnostico.textContent =
            `OS #${os.idOS} - ${obterNomeCliente(os.idCliente)}`;

        campoDiagnostico.value = os.diagnostico || "";
        campoSolucao.value = os.solucaoAplicada || "";

        janelaDiagnostico.showModal();
    }

    formularioDiagnostico.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        if (!ordemDiagnostico) {
            return;
        }

        const diagnostico = campoDiagnostico.value.trim();
        const solucaoAplicada = campoSolucao.value.trim();

        if (!diagnostico || !solucaoAplicada) {
            alert("Informe o diagnóstico e a solução aplicada.");
            return;
        }

        salvarDiagnostico.disabled = true;
        salvarDiagnostico.textContent = "Salvando...";

        try {

            const idOS = ordemDiagnostico.idOS;

            await consultarAPI(
                `/api/ordens-servico/${idOS}/diagnostico`,
                "PATCH",
                { diagnostico, solucaoAplicada }
            );

            janelaDiagnostico.close();

            await carregarDados();

            mensagem.textContent =
                `Diagnóstico e solução da OS #${idOS} registrados com sucesso!`;

        } catch (erro) {

            console.error("Erro ao salvar diagnóstico:", erro);
            alert(erro.message);

        } finally {

            salvarDiagnostico.disabled = false;
            salvarDiagnostico.textContent = "Salvar diagnóstico";
        }
    });

    // ======================================
    // NOVO: JANELA DE HISTÓRICO
    // ======================================

    const janelaHistorico = document.createElement("dialog");
    janelaHistorico.id = "janela-historico-os";

    const tituloHistorico = document.createElement("h2");
    tituloHistorico.textContent = "Histórico da Ordem de Serviço";

    const descricaoHistorico = document.createElement("p");

    const listaHistorico = document.createElement("ol");
    listaHistorico.style.paddingLeft = "22px";

    const acoesHistorico = document.createElement("div");
    acoesHistorico.className = "acoes-editor";

    const fecharHistorico = criarBotao(
        "Fechar",
        () => janelaHistorico.close()
    );

    acoesHistorico.appendChild(fecharHistorico);

    janelaHistorico.appendChild(tituloHistorico);
    janelaHistorico.appendChild(descricaoHistorico);
    janelaHistorico.appendChild(listaHistorico);
    janelaHistorico.appendChild(acoesHistorico);

    document.body.appendChild(janelaHistorico);

    // ======================================
    // NOVO: CONSULTAR HISTÓRICO DA OS
    // ======================================

    async function abrirHistorico(os) {

        tituloHistorico.textContent =
            `Histórico da OS #${os.idOS}`;

        descricaoHistorico.textContent =
            `Cliente: ${obterNomeCliente(os.idCliente)}`;

        listaHistorico.replaceChildren();

        const carregando = document.createElement("li");
        carregando.textContent = "Carregando histórico...";

        listaHistorico.appendChild(carregando);

        fecharHistorico.disabled = false;
        janelaHistorico.showModal();

        try {

            // Consultar o histórico real da OS no MySQL
            const historico = await consultarAPI(
                `/api/ordens-servico/${os.idOS}/historico`
            );

            if (!Array.isArray(historico)) {
                throw new Error("Histórico retornado em formato inválido.");
            }

            listaHistorico.replaceChildren();

            if (historico.length === 0) {

                const item = document.createElement("li");
                item.textContent = "Nenhuma alteração registrada.";

                listaHistorico.appendChild(item);
                return;
            }

            // Mostrar cada movimentação registrada
            historico.forEach((registro) => {

                const item = document.createElement("li");
                item.style.marginBottom = "18px";

                const statusNovo = document.createElement("strong");
                statusNovo.textContent =
                    registro.statusNovo || "Não informado";

                const statusAnterior = document.createElement("p");

                statusAnterior.textContent =
                    registro.statusAnterior == null
                        ? "Criação da Ordem de Serviço"
                        : `Status anterior: ${registro.statusAnterior}`;

                const data = document.createElement("small");

                data.textContent =
                    `Data: ${formatarData(registro.dataAlteracao)}`;

                item.appendChild(statusNovo);
                item.appendChild(statusAnterior);
                item.appendChild(data);

                listaHistorico.appendChild(item);
            });

        } catch (erro) {

            console.error("Erro ao carregar histórico:", erro);

            listaHistorico.replaceChildren();

            const item = document.createElement("li");
            item.textContent =
                `Não foi possível carregar o histórico: ${erro.message}`;

            listaHistorico.appendChild(item);
        }
    }

    // ======================================
    // TABELA DE ORDENS
    // ======================================

    function atualizarTabela() {

        tabela.replaceChildren();

        const ordensFiltradas = todasOrdens.filter((os) => {

            return filtro.value === "todos" ||
                classeStatus(os.statusOS) === filtro.value;
        });

        ordensFiltradas.forEach((os) => {

            const linha = document.createElement("tr");

            linha.className =
                `linha-os ${classeStatus(os.statusOS)}`;

            criarCelula(linha, `#${os.idOS}`);
            criarCelula(linha, obterNomeCliente(os.idCliente));

            criarCelula(
                linha,
                os.descricaoProblema || "Não informado"
            );

            criarCelula(
                linha,
                obterNomeTecnico(os.idTecnico)
            );

            adicionarStatus(linha, os.statusOS);

            const celulaAcoes = document.createElement("td");
            celulaAcoes.className = "acoes-tabela";

            // Detalhes
            celulaAcoes.appendChild(
                criarBotao("Detalhes", () => {
                    mostrarDetalhes(os);
                })
            );

            // NOVO: Histórico, inclusive de OS finalizadas
            celulaAcoes.appendChild(
                criarBotao("Histórico", () => {
                    abrirHistorico(os);
                })
            );

            // Ações disponíveis apenas para OS abertas
            if (!osFinalizada(os)) {

                celulaAcoes.appendChild(
                    criarBotao(
                        os.idTecnico == null
                            ? "Atribuir"
                            : "Alterar técnico",
                        () => abrirAtribuicao(os)
                    )
                );

                celulaAcoes.appendChild(
                    criarBotao("Alterar status", () => {
                        abrirAlteracaoStatus(os);
                    })
                );

                celulaAcoes.appendChild(
                    criarBotao("Registrar diagnóstico", () => {
                        abrirDiagnostico(os);
                    })
                );
            }

            linha.appendChild(celulaAcoes);
            tabela.appendChild(linha);
        });

        mensagem.textContent =
            `${ordensFiltradas.length} ordem(ns) encontrada(s).`;

        if (ordensFiltradas.length === 0) {

            const linha = document.createElement("tr");
            const celula = document.createElement("td");

            celula.colSpan = 6;
            celula.textContent = "Nenhuma ordem encontrada.";

            linha.appendChild(celula);
            tabela.appendChild(linha);
        }
    }

    // ======================================
    // ORDENS RECENTES
    // ======================================

    function atualizarRecentes() {

        recentes.replaceChildren();

        const ultimasOrdens = [...todasOrdens]
            .sort((a, b) => Number(b.idOS) - Number(a.idOS))
            .slice(0, 3);

        ultimasOrdens.forEach((os) => {

            const linha = document.createElement("tr");

            criarCelula(linha, `#${os.idOS}`);
            criarCelula(linha, obterNomeCliente(os.idCliente));
            adicionarStatus(linha, os.statusOS);

            recentes.appendChild(linha);
        });
    }

    // ======================================
    // CARREGAR DADOS REAIS DO MYSQL
    // ======================================

    async function carregarDados() {

        const [ordens, clientes, tecnicos] = await Promise.all([
            consultarAPI("/api/ordens-servico"),
            consultarAPI("/api/clientes"),
            consultarAPI("/api/tecnicos")
        ]);

        if (
            !Array.isArray(ordens) ||
            !Array.isArray(clientes) ||
            !Array.isArray(tecnicos)
        ) {
            throw new Error("A API retornou dados inválidos.");
        }

        todasOrdens = ordens;

        nomesClientes = new Map(
            clientes.map((cliente) => [
                String(cliente.idUsuario),
                cliente.nomeCompleto
            ])
        );

        nomesTecnicos = new Map(
            tecnicos.map((tecnico) => [
                String(tecnico.idUsuario),
                tecnico.nomeCompleto
            ])
        );

        tecnicosAtivos = tecnicos.filter((tecnico) => {

            return (
                tecnico.ativo === 1 ||
                tecnico.ativo === true ||
                tecnico.ativo === "1"
            );
        });

        atualizarTabela();
        atualizarRecentes();
    }

    // ======================================
    // INICIALIZAÇÃO
    // ======================================

    filtro.addEventListener("change", atualizarTabela);

    carregarDados().catch((erro) => {

        console.error("Erro ao carregar ordens:", erro);

        mensagem.textContent =
            "Não foi possível carregar as ordens de serviço.";
    });

});