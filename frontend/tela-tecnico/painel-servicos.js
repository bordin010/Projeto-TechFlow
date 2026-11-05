// ======================================
// TECHFLOW - PAINEL DO TÉCNICO
// Serviços, status, diagnóstico e conclusão
// ======================================

document.addEventListener("DOMContentLoaded", () => {

    const listaTarefas = document.getElementById("tarefas");
    const listaHistorico = document.getElementById("lista-historico");
    const mensagem = document.getElementById("mensagem");

    const totalTecnico = document.getElementById("total-tecnico");
    const ativosTecnico = document.getElementById("ativos-tecnico");
    const finalizadosTecnico = document.getElementById("finalizados-tecnico");

    const selecaoTecnico = document.getElementById("tecnico-atual");

    const filtros = document.querySelectorAll(
        'input[name="status-tecnico"]'
    );

    const token = sessionStorage.getItem("techflow_token");

    if (!listaTarefas || !listaHistorico || !token) {
        return;
    }

    let ordens = [];

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
    // IDENTIFICAR O TÉCNICO
    // ======================================

    function obterUsuarioSalvo() {

        try {

            const texto = sessionStorage.getItem("techflow_usuario");

            return texto ? JSON.parse(texto) : null;

        } catch (erro) {

            console.error("Erro ao recuperar usuário:", erro);
            return null;
        }
    }

    function atualizarIdentificacao(usuario) {

        const salvo = obterUsuarioSalvo();

        const mesmoUsuario = salvo &&
            String(salvo.idUsuario) === String(usuario.idUsuario);

        const nome = usuario.nomeCompleto ||
            (mesmoUsuario ? salvo.nomeCompleto : null) ||
            "Técnico";

        const saudacao = document.getElementById("saudacao-tecnico");
        const nomeTopo = document.getElementById("nome-topo");

        if (saudacao) {
            saudacao.textContent = `Olá, ${nome}.`;
        }

        if (nomeTopo) {
            nomeTopo.textContent = nome;
        }

        if (selecaoTecnico) {

            selecaoTecnico.replaceChildren();

            const opcao = document.createElement("option");

            opcao.value = String(usuario.idUsuario);
            opcao.textContent = nome;

            selecaoTecnico.appendChild(opcao);
            selecaoTecnico.disabled = true;
        }

        const perfil = document.getElementById("consulta-perfil");

        if (perfil) {

            perfil.querySelectorAll("p").forEach(
                (paragrafo) => paragrafo.remove()
            );

            const descricao = document.createElement("p");

            descricao.textContent = `Profissional autenticado: ${nome}`;

            perfil.appendChild(descricao);
        }
    }

    // ======================================
    // STATUS
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

    function possuiDiagnosticoESolucao(os) {

        return typeof os.diagnostico === "string" &&
            os.diagnostico.trim().length > 0 &&
            typeof os.solucaoAplicada === "string" &&
            os.solucaoAplicada.trim().length > 0;
    }

    // ======================================
    // JANELA PARA ALTERAR STATUS
    // ======================================

    const janelaStatus = document.createElement("dialog");
    janelaStatus.id = "janela-status-tecnico";

    const tituloStatus = document.createElement("h2");
    tituloStatus.textContent = "Atualizar status do atendimento";

    const descricaoStatus = document.createElement("p");

    const formularioStatus = document.createElement("form");

    const labelStatus = document.createElement("label");
    labelStatus.htmlFor = "novo-status-tecnico";
    labelStatus.textContent = "Selecione o novo status";

    const campoStatus = document.createElement("select");
    campoStatus.id = "novo-status-tecnico";
    campoStatus.required = true;

    const acoesStatus = document.createElement("div");
    acoesStatus.className = "acoes-editor";

    const cancelarStatus = document.createElement("button");
    cancelarStatus.type = "button";
    cancelarStatus.className = "botao botao-secundario";
    cancelarStatus.textContent = "Cancelar";

    const salvarStatus = document.createElement("button");
    salvarStatus.type = "submit";
    salvarStatus.className = "botao";
    salvarStatus.textContent = "Salvar status";

    acoesStatus.appendChild(cancelarStatus);
    acoesStatus.appendChild(salvarStatus);

    formularioStatus.appendChild(labelStatus);
    formularioStatus.appendChild(campoStatus);
    formularioStatus.appendChild(acoesStatus);

    janelaStatus.appendChild(tituloStatus);
    janelaStatus.appendChild(descricaoStatus);
    janelaStatus.appendChild(formularioStatus);

    document.body.appendChild(janelaStatus);

    let ordemSelecionada = null;

    cancelarStatus.addEventListener("click", () => {
        janelaStatus.close();
    });

    function abrirAlteracaoStatus(os) {

        if (osFinalizada(os)) {
            return;
        }

        ordemSelecionada = os;

        descricaoStatus.textContent =
            `OS #${os.idOS} — Status atual: ${os.statusOS}`;

        campoStatus.replaceChildren();

        const inicial = document.createElement("option");
        inicial.value = "";
        inicial.textContent = "Selecione um novo status";
        inicial.disabled = true;

        campoStatus.appendChild(inicial);

        const permitidos = [
            "Em análise",
            "Em andamento",
            "Aguardando peça"
        ];

        // A conclusão exige diagnóstico e solução já registrados
        if (possuiDiagnosticoESolucao(os)) {
            permitidos.push("Concluída");
        }

        permitidos.forEach((status) => {

            if (status === os.statusOS) {
                return;
            }

            const opcao = document.createElement("option");

            opcao.value = status;
            opcao.textContent = status;

            campoStatus.appendChild(opcao);
        });

        campoStatus.value = "";

        janelaStatus.showModal();
    }

    formularioStatus.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        if (!ordemSelecionada) {
            return;
        }

        const novoStatus = campoStatus.value;

        if (!novoStatus || novoStatus === ordemSelecionada.statusOS) {
            alert("Selecione um novo status válido.");
            return;
        }

        // Confirmar antes de concluir, pois é uma ação definitiva
        if (novoStatus === "Concluída") {

            const confirmar = confirm(
                "Deseja realmente concluir esta Ordem de Serviço? " +
                "Após a conclusão, ela não poderá ser editada."
            );

            if (!confirmar) {
                return;
            }
        }

        salvarStatus.disabled = true;
        salvarStatus.textContent = "Salvando...";

        try {

            const idOS = ordemSelecionada.idOS;

            await consultarAPI(
                `/api/ordens-servico/${idOS}/status`,
                "PATCH",
                { novoStatus }
            );

            janelaStatus.close();

            await carregarOrdens();

            if (mensagem) {
                mensagem.textContent =
                    `Status da OS #${idOS} atualizado para ${novoStatus}!`;
            }

        } catch (erro) {

            console.error("Erro ao atualizar status:", erro);
            alert(erro.message);

        } finally {

            salvarStatus.disabled = false;
            salvarStatus.textContent = "Salvar status";
        }
    });

    // ======================================
    // JANELA DE DIAGNÓSTICO
    // ======================================

    const janelaDiagnostico = document.createElement("dialog");
    janelaDiagnostico.id = "janela-diagnostico-tecnico";

    const tituloDiagnostico = document.createElement("h2");
    tituloDiagnostico.textContent = "Diagnóstico do atendimento";

    const descricaoDiagnostico = document.createElement("p");

    const formularioDiagnostico = document.createElement("form");

    function criarCampoTexto(id, rotulo) {

        const label = document.createElement("label");
        label.htmlFor = id;
        label.textContent = rotulo;

        const campo = document.createElement("textarea");
        campo.id = id;
        campo.rows = 4;
        campo.required = true;

        formularioDiagnostico.appendChild(label);
        formularioDiagnostico.appendChild(campo);

        return campo;
    }

    const campoDiagnostico = criarCampoTexto(
        "diagnostico-tecnico",
        "Diagnóstico do equipamento"
    );

    const campoSolucao = criarCampoTexto(
        "solucao-tecnico",
        "Solução aplicada"
    );

    const acoesDiagnostico = document.createElement("div");
    acoesDiagnostico.className = "acoes-editor";

    const cancelarDiagnostico = document.createElement("button");
    cancelarDiagnostico.type = "button";
    cancelarDiagnostico.className = "botao botao-secundario";
    cancelarDiagnostico.textContent = "Cancelar";

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

    cancelarDiagnostico.addEventListener("click", () => {
        janelaDiagnostico.close();
    });

    function abrirDiagnostico(os) {

        if (osFinalizada(os)) {
            return;
        }

        ordemDiagnostico = os;

        descricaoDiagnostico.textContent =
            `Ordem de Serviço #${os.idOS}`;

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

            await carregarOrdens();

            if (mensagem) {
                mensagem.textContent =
                    `Diagnóstico da OS #${idOS} registrado com sucesso!`;
            }

        } catch (erro) {

            console.error("Erro ao registrar diagnóstico:", erro);
            alert(erro.message);

        } finally {

            salvarDiagnostico.disabled = false;
            salvarDiagnostico.textContent = "Salvar diagnóstico";
        }
    });

    // ======================================
    // CRIAR INFORMAÇÃO DO CARTÃO
    // ======================================

    function criarInformacao(rotulo, valor) {

        const paragrafo = document.createElement("p");
        paragrafo.className = "informacao";

        const titulo = document.createElement("strong");
        titulo.textContent = rotulo;

        const texto = document.createElement("span");
        texto.textContent = valor ?? "Não informado";

        paragrafo.appendChild(titulo);
        paragrafo.appendChild(texto);

        return paragrafo;
    }

    function criarBotao(texto, classe, acao) {

        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = classe;
        botao.textContent = texto;

        botao.addEventListener("click", acao);

        return botao;
    }

    // ======================================
    // CRIAR CARTÃO DE ATENDIMENTO
    // ======================================

    function criarCartao(os) {

        const artigo = document.createElement("article");
        artigo.className =
            `cartao-tarefa ${classeStatus(os.statusOS)}`;

        const topo = document.createElement("div");
        topo.className = "topo-cartao";

        const codigo = document.createElement("span");
        codigo.className = "codigo";
        codigo.textContent = `OS #${os.idOS}`;

        const situacao = document.createElement("span");
        situacao.className =
            `situacao ${classeStatus(os.statusOS)}`;
        situacao.textContent = os.statusOS || "Não informado";

        topo.appendChild(codigo);
        topo.appendChild(situacao);
        artigo.appendChild(topo);

        const titulo = document.createElement("h2");

        const nomeEquipamento = os.nomeEquipamento ||
            `Equipamento #${os.idEquipamento}`;

        const marca = os.marcaEquipamento || "";
        const modelo = os.modeloEquipamento || "";

        titulo.textContent = [
            nomeEquipamento,
            marca,
            modelo
            ].filter(Boolean).join(" ");

        artigo.appendChild(titulo);

        artigo.appendChild(
            criarInformacao(
                "Defeito",
                os.descricaoProblema || "Não informado"
            )
        );

        artigo.appendChild(
    criarInformacao(
        "Cliente",
        os.nomeCliente ||
        `Cliente #${os.idCliente}`
    )
);

        artigo.appendChild(
            criarInformacao(
                "Situação",
                os.statusOS || "Não informado"
            )
        );

        if (os.diagnostico) {
            artigo.appendChild(
                criarInformacao("Diagnóstico", os.diagnostico)
            );
        }

        if (os.solucaoAplicada) {
            artigo.appendChild(
                criarInformacao("Solução aplicada", os.solucaoAplicada)
            );
        }

        const acoes = document.createElement("div");
        acoes.className = "acoes";

        if (!osFinalizada(os)) {

            // Atualizar status
            acoes.appendChild(
                criarBotao(
                    "Atualizar status",
                    "botao botao-secundario",
                    () => abrirAlteracaoStatus(os)
                )
            );

            // Registrar ou editar diagnóstico
            acoes.appendChild(
                criarBotao(
                    "Registrar diagnóstico",
                    "botao",
                    () => abrirDiagnostico(os)
                )
            );

        } else {

            const concluido = document.createElement("button");
            concluido.type = "button";
            concluido.className = "botao botao-secundario";

            concluido.textContent = os.statusOS === "Concluída"
                ? "Serviço concluído"
                : "Serviço cancelado";

            concluido.disabled = true;

            acoes.appendChild(concluido);
        }

        artigo.appendChild(acoes);

        return artigo;
    }

    // ======================================
    // INDICADORES
    // ======================================

    function atualizarIndicadores() {

        const total = ordens.length;

        const emAndamento = ordens.filter((os) =>
            ["Em andamento", "Aguardando peça"].includes(os.statusOS)
        ).length;

        const concluidas = ordens.filter((os) =>
            os.statusOS === "Concluída"
        ).length;

        if (totalTecnico) {
            totalTecnico.textContent = total;
        }

        if (ativosTecnico) {
            ativosTecnico.textContent = emAndamento;
        }

        if (finalizadosTecnico) {
            finalizadosTecnico.textContent = concluidas;
        }
    }

    // ======================================
    // FILTROS
    // ======================================

    function classeFiltroAtual() {

        const selecionado = document.querySelector(
            'input[name="status-tecnico"]:checked'
        );

        return selecionado?.value || "todos";
    }

    function atualizarTarefas() {

        listaTarefas.replaceChildren();

        const filtroAtual = classeFiltroAtual();

        const filtradas = ordens.filter((os) =>
            filtroAtual === "todos" ||
            classeStatus(os.statusOS) === filtroAtual
        );

        filtradas.forEach((os) => {
            listaTarefas.appendChild(criarCartao(os));
        });

        if (filtradas.length === 0) {

            const aviso = document.createElement("p");
            aviso.className = "sem-resultados";

            aviso.textContent =
                "Nenhum serviço corresponde aos filtros selecionados.";

            listaTarefas.appendChild(aviso);
        }

        if (mensagem) {
            mensagem.textContent =
                `${filtradas.length} serviço(s) encontrado(s).`;
        }
    }

    // ======================================
    // FORMATAR DATA
    // ======================================

    function formatarData(valor) {

        if (!valor) {
            return "Não informada";
        }

        const texto = String(valor);

        const data = new Date(
            texto.includes("T")
                ? texto
                : texto.replace(" ", "T")
        );

        if (Number.isNaN(data.getTime())) {
            return "Não informada";
        }

        return data.toLocaleString("pt-BR");
    }

    function criarCelula(linha, valor) {

        const celula = document.createElement("td");
        celula.textContent = valor ?? "Não informado";

        linha.appendChild(celula);

        return celula;
    }

    // ======================================
    // HISTÓRICO DE CONCLUÍDOS
    // ======================================

    function atualizarHistorico() {

        listaHistorico.replaceChildren();

        const concluidas = ordens.filter((os) =>
            os.statusOS === "Concluída"
        );

        if (concluidas.length === 0) {

            const linha = document.createElement("tr");
            const celula = document.createElement("td");

            celula.colSpan = 5;
            celula.textContent =
                "Nenhum serviço concluído encontrado.";

            linha.appendChild(celula);
            listaHistorico.appendChild(linha);

            return;
        }

        concluidas.forEach((os) => {

            const linha = document.createElement("tr");

            criarCelula(
                linha,
                formatarData(os.dataConclusao)
            );

            criarCelula(
    linha,
    `#${os.idOS} · ${os.nomeCliente || `Cliente #${os.idCliente}`}`
);

criarCelula(
    linha,
    [
        os.nomeEquipamento || `Equipamento #${os.idEquipamento}`,
        os.marcaEquipamento,
        os.modeloEquipamento
    ].filter(Boolean).join(" ")
);

            criarCelula(linha, "Não informado");

            const statusCelula = document.createElement("td");
            const situacao = document.createElement("span");

            situacao.className = "situacao concluida";
            situacao.textContent = "Concluída";

            statusCelula.appendChild(situacao);
            linha.appendChild(statusCelula);

            listaHistorico.appendChild(linha);
        });
    }

    // ======================================
    // LOGÍSTICA SEM DADOS DEMONSTRATIVOS
    // ======================================

    function limparLogisticaDemonstrativa() {

        const logistica = document.getElementById(
            "consulta-logistica"
        );

        if (!logistica) {
            return;
        }

        logistica.querySelectorAll(".item-consulta").forEach(
            (item) => item.remove()
        );

        if (!logistica.querySelector("[data-aviso-logistica]")) {

            const aviso = document.createElement("p");
            aviso.dataset.avisoLogistica = "true";

            aviso.textContent =
                "Endereços dos atendimentos serão integrados posteriormente.";

            logistica.appendChild(aviso);
        }
    }

    // ======================================
    // CARREGAR ORDENS REAIS
    // ======================================

    async function carregarOrdens() {

        const resultado = await consultarAPI("/api/ordens-servico");

        if (!Array.isArray(resultado)) {
            throw new Error("A API não retornou uma lista válida.");
        }

        ordens = resultado;

        atualizarIndicadores();
        atualizarTarefas();
        atualizarHistorico();
    }

    // ======================================
    // INICIALIZAR PAINEL
    // ======================================

    async function iniciarPainel() {

        try {

            if (mensagem) {
                mensagem.textContent =
                    "Carregando serviços atribuídos...";
            }

            const sessao = await consultarAPI("/api/auth/sessao");

            if (
                !sessao.usuario ||
                sessao.usuario.perfil !== "tecnico"
            ) {
                throw new Error(
                    "Acesso permitido somente a técnicos."
                );
            }

            atualizarIdentificacao(sessao.usuario);

            limparLogisticaDemonstrativa();

            await carregarOrdens();

        } catch (erro) {

            console.error("Erro no painel técnico:", erro);

            ordens = [];

            listaTarefas.replaceChildren();
            listaHistorico.replaceChildren();

            if (mensagem) {
                mensagem.textContent =
                    `Não foi possível carregar os serviços: ${erro.message}`;
            }
        }
    }

    filtros.forEach((filtro) => {
        filtro.addEventListener("change", atualizarTarefas);
    });

    iniciarPainel();

});