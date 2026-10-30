const API_URL = "http://localhost:3000/api";

const formularioLogin = document.getElementById("formulario-login");
const formularioCadastro = document.getElementById("formulario-cadastro");

const mensagemLogin = document.getElementById("mensagem-login");
const mensagemCadastro = document.getElementById("mensagem-cadastro");

// LOGIN DO CLIENTE
formularioLogin.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    mensagemLogin.textContent = "Verificando seus dados...";

    const email = document.getElementById("email-login").value.trim();
    const senha = document.getElementById("senha-login").value;

    try {
        const resposta = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                senha,
                perfil: "cliente"
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || "Não foi possível realizar o login.");
        }

        sessionStorage.setItem("token", dados.token);
        sessionStorage.setItem("usuario", JSON.stringify(dados.usuario));

        mensagemLogin.textContent = "Login realizado! Redirecionando...";

        window.location.href = "../techflow-solicitacao/index.html";
    } catch (erro) {
        mensagemLogin.textContent = erro.message;
    }
});

// CADASTRO DO CLIENTE
formularioCadastro.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    mensagemCadastro.textContent = "";

    const nome = document.getElementById("nome-cliente").value.trim();
    const email = document.getElementById("email-cadastro").value.trim();
    const telefone = document.getElementById("telefone-cliente").value.trim();
    const senha = document.getElementById("senha-cadastro").value;
    const confirmarSenha = document.getElementById("confirmar-senha").value;

    if (senha.length < 8) {
        mensagemCadastro.textContent = "A senha deve ter pelo menos 8 caracteres.";
        return;
    }

    if (senha !== confirmarSenha) {
        mensagemCadastro.textContent = "As senhas não coincidem.";
        return;
    }

    mensagemCadastro.textContent = "Criando sua conta...";

    try {
        const resposta = await fetch(`${API_URL}/clientes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nome,
                email,
                senha,
                telefone,
                endereco: ""
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || "Não foi possível criar sua conta.");
        }

        mensagemCadastro.textContent =
            "Conta criada com sucesso! Faça login para continuar.";

        formularioCadastro.reset();
    } catch (erro) {
        mensagemCadastro.textContent = erro.message;
    }
});