// ==========================================
// TECHFLOW - OCORRÊNCIAS DO TÉCNICO
// Integração com API e MySQL
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    const janela = document.getElementById("registro-ocorrencia");
    const campoDescricao = document.getElementById("nota-servico");

    if (!janela || !campoDescricao) {
        return;
    }

    const token = sessionStorage.getItem("techflow_token");

    // ======================================
    // CRIAR SELETOR DE ORDENS DE SERVIÇO
    // ======================================

    const labelOS = document.createElement("label");
    labelOS.htmlFor = "ocorrencia-os";
    labelOS.textContent = "Ordem de Serviço";

    const selecionarOS = document.createElement("select");
    selecionarOS.id = "ocorrencia-os";
    selecionarOS.required = true;

    const mensagem = document.createElement("p");
    mensagem.id = "mensagem-ocorrencia";
    mensagem.setAttribute("role", "status");
    mensagem.setAttribute("aria-live", "polite");

    // Histórico das ocorrências
    const tituloHistorico = document.createElement("h3");
    tituloHistorico.textContent = "Ocorrências registradas";

    const listaHistorico = document.createElement("div");
    listaHistorico.id = "historico-ocorrencias";

    // Botão de salvar
    const botaoSalvar = document.createElement("button");
    botaoSalvar.type = "button";
    botaoSalvar.className = "botao";
    botaoSalvar.textContent = "Salvar ocorrência";

    // Posicionar os elementos na janela existente
    const labelDescricao = janela.querySelector(
        'label[for="nota-servico"]'
    );

    if (labelDescricao) {
        labelDescricao.before(labelOS, selecionarOS);
    }

    campoDescricao.after(
        mensagem,
        botaoSalvar,
        tituloHistorico,
        listaHistorico
    );

    // Remover apenas o texto antigo de demonstração
    janela.querySelectorAll("p").forEach((p) => {
        if (p.textContent.includes(
            "O registro será enviado quando esta área"
        )) {
            p.remove();
        }
    });

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
                dados.mensagem || "Erro ao consultar a API."
            );
        }

        return dados;
    }

    // ======================================
    // FORMATAR DATA
    // ======================================

    function formatarData(valor) {

        if (!valor) {
            return "Data não informada";
        }

        const data = new Date(valor);

        if (Number.isNaN(data.getTime())) {
            return "Data não informada";
        }

        return data.toLocaleString("pt-BR");
    }

    // ======================================
    // CARREGAR ORDENS ATRIBUÍDAS
    // ======================================

    async function carregarOrdens() {

        selecionarOS.replaceChildren();

        const opcaoInicial = document.createElement("option");
        opcaoInicial.value = "";
        opcaoInicial.textContent = "Selecione uma OS";

        selecionarOS.appendChild(opcaoInicial);

        const ordens = await consultarAPI("/api/ordens-servico");

        if (!Array.isArray(ordens)) {
            throw new Error("Lista de ordens inválida.");
        }

        // Somente ordens não finalizadas
        const disponíveis = ordens.filter((os) =>
            !["Concluída", "Cancelada"].includes(os.statusOS)
        );

        disponíveis.forEach((os) => {

            const opcao = document.createElement("option");

            opcao.value = os.idOS;

            opcao.textContent =
                `OS #${os.idOS} - ` +
                `${os.nomeEquipamento || "Equipamento"} ` +
                `(${os.statusOS})`;

            selecionarOS.appendChild(opcao);
        });

        if (disponíveis.length === 0) {
            mensagem.textContent =
                "Nenhuma OS disponível para registrar ocorrência.";
            botaoSalvar.disabled = true;
        } else {
            botaoSalvar.disabled = false;
        }
    }

    // ======================================
    // CARREGAR HISTÓRICO DA OS
    // ======================================

    async function carregarHistorico() {

        listaHistorico.replaceChildren();

        const idOS = selecionarOS.value;

        if (!idOS) {
            return;
        }

        const ocorrencias = await consultarAPI(
            `/api/ocorrencias/${idOS}`
        );

        if (!Array.isArray(ocorrencias)) {
            throw new Error("Histórico inválido.");
        }

        if (ocorrencias.length === 0) {

            const aviso = document.createElement("p");
            aviso.textContent =
                "Nenhuma ocorrência registrada nesta OS.";

            listaHistorico.appendChild(aviso);
            return;
        }

        ocorrencias.forEach((ocorrencia) => {

            const item = document.createElement("article");
            item.className = "item-consulta";

            const cabecalho = document.createElement("strong");
            cabecalho.textContent =
                `${ocorrencia.nomeTecnico} - ` +
                formatarData(ocorrencia.dataRegistro);

            const descricao = document.createElement("p");
            descricao.textContent = ocorrencia.descricao;

            item.appendChild(cabecalho);
            item.appendChild(descricao);

            listaHistorico.appendChild(item);
        });
    }

    // ======================================
    // SALVAR OCORRÊNCIA
    // ======================================

    async function salvarOcorrencia() {

        const idOS = selecionarOS.value;
        const descricao = campoDescricao.value.trim();

        if (!idOS) {
            mensagem.textContent = "Selecione uma Ordem de Serviço.";
            return;
        }

        if (!descricao) {
            mensagem.textContent = "Descreva a ocorrência.";
            return;
        }

        if (descricao.length > 800) {
            mensagem.textContent =
                "A descrição deve ter no máximo 800 caracteres.";
            return;
        }

        botaoSalvar.disabled = true;
        mensagem.textContent = "Salvando ocorrência...";

        try {

            await consultarAPI(
                "/api/ocorrencias",
                "POST",
                {
                    idOS: Number(idOS),
                    descricao
                }
            );

            mensagem.textContent =
                "Ocorrência registrada com sucesso!";

            campoDescricao.value = "";

            await carregarHistorico();

        } catch (erro) {

            console.error("Erro ao registrar ocorrência:", erro);

            mensagem.textContent = erro.message;

        } finally {

            botaoSalvar.disabled = false;
        }
    }

    // ======================================
    // EVENTOS
    // ======================================

    selecionarOS.addEventListener("change", async () => {

        mensagem.textContent = "";

        try {
            await carregarHistorico();
        } catch (erro) {
            mensagem.textContent = erro.message;
        }
    });

    botaoSalvar.addEventListener("click", salvarOcorrencia);

    // Carregar as OS ao abrir a janela
    janela.addEventListener("toggle", async (evento) => {

        if (evento.newState !== "open") {
            return;
        }

        mensagem.textContent = "";
        listaHistorico.replaceChildren();

        if (!token) {
            mensagem.textContent =
                "Sessão não encontrada. Faça login novamente.";
            botaoSalvar.disabled = true;
            return;
        }

        try {
            await carregarOrdens();
        } catch (erro) {
            mensagem.textContent = erro.message;
            botaoSalvar.disabled = true;
        }
    });

});