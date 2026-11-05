
// ======================================
// TECHFLOW - GERENCIAMENTO DE TÉCNICOS
// ======================================

document.addEventListener("DOMContentLoaded", () => {

    const formulario = document.getElementById("formulario-tecnico");
    const lista = document.getElementById("lista-tecnicos");
    const mensagem = document.getElementById("mensagem-tecnico");

    const botao = formulario?.querySelector('button[type="submit"]');
    const token = sessionStorage.getItem("techflow_token");

    if (!formulario || !lista || !mensagem || !botao || !token) {
        return;
    }

    botao.disabled = false;
    botao.removeAttribute("title");

    // Exibir mensagens no painel
    function mostrarMensagem(texto) {
        mensagem.textContent = texto;
    }

    // ======================================
    // VALIDAR CPF
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

    // ======================================
    // VALIDAR E-MAIL
    // ======================================

    function emailValido(email) {
        return typeof email === "string" &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    }

    // ======================================
    // VALIDAR SENHA
    // ======================================

    function senhaValida(senha) {
        return typeof senha === "string" &&
            senha.length >= 8 &&
            /[A-Z]/.test(senha) &&
            /[a-z]/.test(senha) &&
            /\d/.test(senha);
    }

    // ======================================
    // LISTAR TÉCNICOS
    // ======================================

    async function carregarTecnicos() {

        try {

            const resposta = await fetch("/api/tecnicos", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                cache: "no-store"
            });

            if (!resposta.ok) {
                throw new Error("Erro ao consultar técnicos.");
            }

            const tecnicos = await resposta.json();

            if (!Array.isArray(tecnicos)) {
                throw new Error("Resposta inválida da API.");
            }

            lista.replaceChildren();

            tecnicos.forEach((tecnico) => {

                const item = document.createElement("li");

                item.textContent = tecnico.nomeCompleto;

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

        } catch (erro) {

            console.error("Erro ao carregar técnicos:", erro);

            mostrarMensagem("Não foi possível carregar os técnicos.");
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

        // Validar nome
        if (!nomeCompleto) {
            mostrarMensagem("Informe o nome completo do técnico.");
            return;
        }

        // Validar CPF
        if (!cpfValido(cpf)) {
            mostrarMensagem(
                "CPF inválido. Informe um CPF com 11 dígitos e verificadores corretos."
            );
            return;
        }

        // Validar e-mail
        if (!emailValido(email)) {
            mostrarMensagem(
                "E-mail inválido. Verifique o endereço informado."
            );
            return;
        }

        // Validar senha
        if (!senhaValida(senha)) {
            mostrarMensagem(
                "Senha inválida. Use pelo menos 8 caracteres, " +
                "com letra maiúscula, minúscula e número."
            );
            return;
        }

        botao.disabled = true;
        botao.textContent = "Cadastrando...";

        mostrarMensagem("Salvando técnico no MySQL...");

        try {

            const resposta = await fetch("/api/tecnicos", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    nomeCompleto,
                    cpf: cpf.replace(/\D/g, ""),
                    email,
                    telefone,
                    endereco,
                    senha
                })
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                mostrarMensagem(
                    dados.mensagem || "Erro ao cadastrar técnico."
                );
                return;
            }

            formulario.reset();

            await carregarTecnicos();

            mostrarMensagem("Técnico cadastrado com sucesso!");

        } catch (erro) {

            console.error("Erro ao cadastrar técnico:", erro);

            mostrarMensagem(
                "Erro de conexão. Não foi possível cadastrar o técnico."
            );

        } finally {

            botao.disabled = false;
            botao.textContent = "Cadastrar técnico";
        }
    });

    // Carregar técnicos ao abrir o painel
    carregarTecnicos();

});
