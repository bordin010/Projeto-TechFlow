// ======================================
// TECHFLOW - GERENCIAMENTO DE TÉCNICOS
// Cadastro, listagem, edição e situação
// ======================================

document.addEventListener("DOMContentLoaded", () => {

    const formulario = document.getElementById("formulario-tecnico");
    const lista = document.getElementById("lista-tecnicos");
    const mensagem = document.getElementById("mensagem-tecnico");

    const botaoCadastrar = formulario?.querySelector(
        'button[type="submit"]'
    );

    const token = sessionStorage.getItem("techflow_token");

    if (!formulario || !lista || !mensagem || !botaoCadastrar || !token) {
        return;
    }

    botaoCadastrar.disabled = false;
    botaoCadastrar.removeAttribute("title");

    // ======================================
    // MENSAGENS
    // ======================================

    function mostrarMensagem(texto) {
        mensagem.textContent = texto;
    }

    // ======================================
    // VALIDAÇÕES
    // ======================================

    function cpfValido(cpf) {

        if (typeof cpf !== "string") {
            return false;
        }

        const numeros = cpf.replace(/\D/g, "");

        if (
            !/^\d{11}$/.test(numeros) ||
            /^(\d)\1{10}$/.test(numeros)
        ) {
            return false;
        }

        for (let tamanho = 9; tamanho < 11; tamanho++) {

            let soma = 0;

            for (let i = 0; i < tamanho; i++) {
                soma += Number(numeros[i]) * (tamanho + 1 - i);
            }

            const resto = (soma * 10) % 11;
            const digito = resto === 10 ? 0 : resto;

            if (digito !== Number(numeros[tamanho])) {
                return false;
            }
        }

        return true;
    }

    function emailValido(email) {
        return typeof email === "string" &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    }

    function senhaValida(senha) {
        return typeof senha === "string" &&
            senha.length >= 8 &&
            /[A-Z]/.test(senha) &&
            /[a-z]/.test(senha) &&
            /\d/.test(senha);
    }

    // ======================================
    // REQUISIÇÕES PARA A API
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
    // JANELA DE EDIÇÃO
    // ======================================

    const janela = document.createElement("dialog");
    janela.id = "janela-editar-tecnico";

    const tituloJanela = document.createElement("h2");
    tituloJanela.textContent = "Editar técnico";

    const formularioEdicao = document.createElement("form");
    formularioEdicao.id = "formulario-editar-tecnico";

    function criarCampo(rotulo, id, tipo, obrigatorio = false) {

        const label = document.createElement("label");
        label.htmlFor = id;
        label.textContent = rotulo;

        const input = document.createElement("input");
        input.id = id;
        input.type = tipo;
        input.required = obrigatorio;

        formularioEdicao.appendChild(label);
        formularioEdicao.appendChild(input);

        return input;
    }

    const campoNome = criarCampo(
        "Nome completo", "editar-nome-tecnico", "text", true
    );

    const campoEmail = criarCampo(
        "E-mail", "editar-email-tecnico", "email", true
    );

    const campoTelefone = criarCampo(
        "Telefone", "editar-telefone-tecnico", "tel"
    );

    const campoEndereco = criarCampo(
        "Endereço", "editar-endereco-tecnico", "text"
    );

    const acoes = document.createElement("div");
    acoes.className = "acoes-editor";

    const botaoCancelar = document.createElement("button");
    botaoCancelar.type = "button";
    botaoCancelar.className = "botao-detalhes";
    botaoCancelar.textContent = "Cancelar";

    const botaoSalvar = document.createElement("button");
    botaoSalvar.type = "submit";
    botaoSalvar.className = "botao";
    botaoSalvar.textContent = "Salvar alterações";

    acoes.appendChild(botaoCancelar);
    acoes.appendChild(botaoSalvar);

    formularioEdicao.appendChild(acoes);

    janela.appendChild(tituloJanela);
    janela.appendChild(formularioEdicao);

    document.body.appendChild(janela);

    let idTecnicoEdicao = null;

    botaoCancelar.addEventListener("click", () => {
        janela.close();
    });

    function editarTecnico(tecnico) {

        idTecnicoEdicao = tecnico.idUsuario;

        campoNome.value = tecnico.nomeCompleto || "";
        campoEmail.value = tecnico.email || "";
        campoTelefone.value = tecnico.telefone || "";
        campoEndereco.value = tecnico.endereco || "";

        janela.showModal();
    }

    // ======================================
    // LISTAR TÉCNICOS
    // ======================================

    async function carregarTecnicos() {

        const tecnicos = await consultarAPI("/api/tecnicos");

        if (!Array.isArray(tecnicos)) {
            throw new Error("Resposta inválida da API.");
        }

        lista.replaceChildren();

        tecnicos.forEach((tecnico) => {

            const item = document.createElement("li");

            // Nome do técnico
            const nome = document.createElement("span");
            nome.textContent = tecnico.nomeCompleto;

            // Situação do cadastro
            const ativo = (
                tecnico.ativo === 1 ||
                tecnico.ativo === true ||
                tecnico.ativo === "1"
            );

            const situacao = document.createElement("span");
            situacao.textContent = ativo ? "Ativo" : "Inativo";

            situacao.style.fontWeight = "bold";
            situacao.style.color = ativo
                ? "#278b7e"
                : "#a33e4c";

            // Botão Editar
            const botaoEditar = document.createElement("button");
            botaoEditar.type = "button";
            botaoEditar.className = "botao-detalhes";
            botaoEditar.textContent = "Editar";

            botaoEditar.addEventListener("click", () => {
                editarTecnico(tecnico);
            });

            // Botão Desativar / Reativar
            const botaoSituacao = document.createElement("button");
            botaoSituacao.type = "button";

            botaoSituacao.className = ativo
                ? "botao-excluir"
                : "botao-detalhes";

            botaoSituacao.textContent = ativo
                ? "Desativar"
                : "Reativar";

            botaoSituacao.addEventListener("click", async () => {
                await alterarSituacao(tecnico, ativo, botaoSituacao);
            });

            // Adicionar elementos à lista
            item.appendChild(nome);
            item.appendChild(situacao);
            item.appendChild(botaoEditar);
            item.appendChild(botaoSituacao);

            lista.appendChild(item);
        });

        if (tecnicos.length === 0) {

            const item = document.createElement("li");
            item.textContent = "Nenhum técnico cadastrado.";

            lista.appendChild(item);
        }

        mostrarMensagem(
            `${tecnicos.length} técnico(s) cadastrado(s) no sistema.`
        );
    }

    // ======================================
    // DESATIVAR OU REATIVAR TÉCNICO
    // ======================================

    async function alterarSituacao(tecnico, ativo, botaoSituacao) {

        const acao = ativo ? "desativar" : "reativar";

        const pergunta = ativo
            ? `Deseja desativar o técnico ${tecnico.nomeCompleto}?`
            : `Deseja reativar o técnico ${tecnico.nomeCompleto}?`;

        // Pedir confirmação antes de alterar
        if (!confirm(pergunta)) {
            return;
        }

        botaoSituacao.disabled = true;
        botaoSituacao.textContent = "Aguarde...";

        try {

            await consultarAPI(
                `/api/tecnicos/${tecnico.idUsuario}/${acao}`,
                "PATCH"
            );

            // Recarregar a lista atualizada
            await carregarTecnicos();

            mostrarMensagem(
                ativo
                    ? "Técnico desativado com sucesso!"
                    : "Técnico reativado com sucesso!"
            );

        } catch (erro) {

            console.error("Erro ao alterar situação:", erro);

            mostrarMensagem(erro.message);

            botaoSituacao.disabled = false;
            botaoSituacao.textContent = ativo
                ? "Desativar"
                : "Reativar";
        }
    }

    // ======================================
    // CADASTRAR TÉCNICO
    // ======================================

    formulario.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        const nomeCompleto = document
            .getElementById("nome-tecnico").value.trim();

        const cpf = document
            .getElementById("cpf-tecnico").value.trim();

        const email = document
            .getElementById("email-tecnico").value.trim();

        const telefone = document
            .getElementById("telefone-tecnico").value.trim();

        const endereco = document
            .getElementById("endereco-tecnico").value.trim();

        const senha = document
            .getElementById("senha-tecnico").value;

        if (!nomeCompleto) {
            mostrarMensagem("Informe o nome completo.");
            return;
        }

        if (!cpfValido(cpf)) {
            mostrarMensagem("CPF inválido.");
            return;
        }

        if (!emailValido(email)) {
            mostrarMensagem("E-mail inválido.");
            return;
        }

        if (!senhaValida(senha)) {
            mostrarMensagem(
                "A senha deve ter pelo menos 8 caracteres, " +
                "com letra maiúscula, minúscula e número."
            );
            return;
        }

        botaoCadastrar.disabled = true;
        botaoCadastrar.textContent = "Cadastrando...";

        try {

            await consultarAPI("/api/tecnicos", "POST", {
                nomeCompleto,
                cpf: cpf.replace(/\D/g, ""),
                email,
                telefone,
                endereco,
                senha
            });

            formulario.reset();

            await carregarTecnicos();

            mostrarMensagem("Técnico cadastrado com sucesso!");

        } catch (erro) {

            console.error("Erro ao cadastrar técnico:", erro);

            mostrarMensagem(erro.message);

        } finally {

            botaoCadastrar.disabled = false;
            botaoCadastrar.textContent = "Cadastrar técnico";
        }
    });

    // ======================================
    // SALVAR EDIÇÃO
    // ======================================

    formularioEdicao.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        if (idTecnicoEdicao === null) {
            return;
        }

        const nomeCompleto = campoNome.value.trim();
        const email = campoEmail.value.trim();
        const telefone = campoTelefone.value.trim();
        const endereco = campoEndereco.value.trim();

        if (!nomeCompleto) {
            alert("Informe o nome completo.");
            return;
        }

        if (!emailValido(email)) {
            alert("Informe um e-mail válido.");
            return;
        }

        botaoSalvar.disabled = true;
        botaoSalvar.textContent = "Salvando...";

        try {

            await consultarAPI(
                `/api/tecnicos/${idTecnicoEdicao}`,
                "PUT",
                {
                    nomeCompleto,
                    email,
                    telefone,
                    endereco
                }
            );

            janela.close();

            await carregarTecnicos();

            mostrarMensagem("Técnico atualizado com sucesso!");

        } catch (erro) {

            console.error("Erro ao editar técnico:", erro);

            alert(erro.message);

        } finally {

            botaoSalvar.disabled = false;
            botaoSalvar.textContent = "Salvar alterações";
        }
    });

    // ======================================
    // CARREGAR DADOS INICIAIS
    // ======================================

    carregarTecnicos().catch((erro) => {
        console.error("Erro ao carregar técnicos:", erro);
        mostrarMensagem(erro.message);
    });

});