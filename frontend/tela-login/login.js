document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("formulario-login");
    const mensagem = document.getElementById("mensagem-login");

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const email = document.getElementById("email").value.trim();
        const senha = document.getElementById("senha").value;
        const perfilSelecionado = document.querySelector(
            'input[name="perfil"]:checked'
        ).value;

        mensagem.textContent = "Verificando suas informações...";

        try {
            // Enviar os dados para o back-end
            const resposta = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    senha: senha
                })
            });

            const dados = await resposta.json();

            // Verificar erros retornados pela API
            if (!resposta.ok) {
                mensagem.textContent =
                    dados.mensagem || "Não foi possível realizar o login.";
                return;
            }

            // Conferir o perfil real registrado no banco
            const perfilReal = dados.usuario.perfil;

            const perfilEsperado =
                perfilSelecionado === "admin"
                    ? "administrador"
                    : "tecnico";

            if (perfilReal !== perfilEsperado) {
                mensagem.textContent =
                    "Esta conta não pertence ao perfil selecionado.";
                return;
            }

            // Guardar a autenticação nesta sessão do navegador
            sessionStorage.setItem("techflow_token", dados.token);
            sessionStorage.setItem(
                "techflow_usuario",
                JSON.stringify(dados.usuario)
            );

            // Redirecionar conforme o perfil
            if (perfilReal === "administrador") {
                window.location.href = "../tela-admin/index.html";
            } else if (perfilReal === "tecnico") {
                window.location.href = "../tela-tecnico/index.html";
            }

        } catch (erro) {
            mensagem.textContent =
                "Não foi possível conectar ao servidor. Tente novamente.";

            console.error("Erro no login:", erro);
        }
    });
});