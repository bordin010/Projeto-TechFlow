const usuario = JSON.parse(sessionStorage.getItem("usuario"));
const token = sessionStorage.getItem("token");

if (!usuario || usuario.perfil !== "tecnico" || !token) {
    alert("Acesso negado! Faça login com uma conta de técnico.");
    sessionStorage.removeItem("usuario");
    sessionStorage.removeItem("token");
    window.location.href = "../tela-login/index.html";
} else {
    // Exibe o nome do técnico na página.
    const nomeTopo = document.getElementById("nome-topo");
    const saudacao = document.getElementById("saudacao-tecnico");

    if (nomeTopo) {
        nomeTopo.textContent = usuario.nome;
    }

    if (saudacao) {
        saudacao.textContent = `Olá, ${usuario.nome}!`;
    }

    // Configura os botões de sair.
    const botoesSair = document.querySelectorAll("[data-sair]");

    botoesSair.forEach((botao) => {
        botao.addEventListener("click", function (evento) {
            evento.preventDefault();

            sessionStorage.removeItem("usuario");
            sessionStorage.removeItem("token");

            window.location.href = "../tela-login/index.html";
        });
    });
}

// Função para fazer requisições autenticadas à API do TechFlow.
async function requisicaoAutenticada(url, opcoes = {}) {
    const tokenAtual = sessionStorage.getItem("token");

    if (!tokenAtual) {
        sessionStorage.removeItem("usuario");
        window.location.href = "../tela-login/index.html";
        throw new Error("Token não encontrado. Faça login novamente.");
    }

    const cabecalhos = {
        ...(opcoes.headers || {}),
        Authorization: `Bearer ${tokenAtual}`
    };

    const resposta = await fetch(url, {
        ...opcoes,
        headers: cabecalhos
    });

    if (resposta.status === 401 || resposta.status === 403) {
        sessionStorage.removeItem("usuario");
        sessionStorage.removeItem("token");
        window.location.href = "../tela-login/index.html";
        throw new Error("Sessão inválida ou expirada. Faça login novamente.");
    }

    return resposta;
}