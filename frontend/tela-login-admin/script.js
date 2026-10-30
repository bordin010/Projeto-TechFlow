const formulario = document.getElementById("formulario-login");
const campoEmail = document.getElementById("email");
const campoSenha = document.getElementById("senha");
const mensagem = document.getElementById("mensagem-login");
const botoesLogin = formulario.querySelectorAll('button[type="submit"]');

formulario.addEventListener("submit", async function (evento) {
evento.preventDefault();

const email = campoEmail.value.trim();
const senha = campoSenha.value;

const perfilSelecionado = document.querySelector(
    'input[name="perfil"]:checked'
);

if (!perfilSelecionado) {
    mensagem.textContent = "Selecione seu perfil para continuar.";
    return;
}

if (!email || !senha) {
    mensagem.textContent = "Preencha o e-mail e a senha.";
    return;
}

const perfil = perfilSelecionado.value;

mensagem.textContent = "Verificando suas credenciais...";

botoesLogin.forEach((botao) => {
    botao.disabled = true;
});

try {
    const resposta = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email,
            senha,
            perfil
        })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
        mensagem.textContent =
            dados.erro || "Não foi possível realizar o login.";
        return;
    }

    mensagem.textContent = dados.mensagem;

    sessionStorage.setItem("usuario", JSON.stringify(dados.usuario));
    sessionStorage.setItem("token", dados.token);

    if (dados.usuario.perfil === "admin") {
        window.location.href = "../tela-admin/index.html";
    } else if (dados.usuario.perfil === "tecnico") {
        window.location.href = "../tela-tecnico/index.html";
    }
} catch (erro) {
    console.error("Erro ao conectar com a API:", erro);

    mensagem.textContent =
        "Não foi possível conectar ao servidor. Verifique se a API está funcionando.";
} finally {
    botoesLogin.forEach((botao) => {
        botao.disabled = false;
    });
}

});