// Proteção do painel administrativo TechFlow
// O backend também verifica as permissões nas rotas privadas.

(() => {

    const destinoLogin = "../tela-login/index.html";

    // Ocultar o painel até verificar a autenticação
    document.documentElement.style.visibility = "hidden";

    // Encerrar a sessão do usuário
    function encerrarSessao() {

        sessionStorage.removeItem("techflow_token");

        sessionStorage.removeItem("techflow_usuario");

        window.location.replace(destinoLogin);
    }

    // Verificar se o usuário pode acessar o painel
    async function verificarAcesso() {

        const token = sessionStorage.getItem("techflow_token");

        const usuarioSalvo = sessionStorage.getItem("techflow_usuario");

        let usuario;

        // Ler os dados salvos durante o login
        try {

            usuario = JSON.parse(usuarioSalvo);

        } catch (erro) {

            encerrarSessao();
            return;
        }

        // Verificar token e perfil
        if (
            !token ||
            !usuario ||
            usuario.perfil !== "administrador"
        ) {

            encerrarSessao();
            return;
        }

        try {

            // Consultar uma rota exclusiva do administrador
            // O backend valida o token e o perfil verdadeiro
            const resposta = await fetch("/api/tecnicos", {

                headers: {
                    Authorization: `Bearer ${token}`
                },

                cache: "no-store"

            });

            // Token inválido, expirado ou acesso proibido
            if (
                resposta.status === 401 ||
                resposta.status === 403
            ) {

                encerrarSessao();
                return;
            }

            // Tratar outros erros do servidor
            if (!resposta.ok) {

                document.body.textContent =
                    "Não foi possível validar o acesso. Recarregue a página para tentar novamente.";

                document.documentElement.style.visibility = "visible";

                return;
            }

            // Acesso permitido
            document.documentElement.style.visibility = "visible";

        } catch (erro) {

            document.body.textContent =
                "Não foi possível conectar ao servidor. Verifique sua conexão e recarregue a página.";

            document.documentElement.style.visibility = "visible";
        }
    }

    // Configurar o painel após carregar o HTML
    document.addEventListener("DOMContentLoaded", () => {

        const sair = document.querySelector("[data-sair]");

        // Fazer o botão Sair encerrar a sessão
        if (sair) {

            sair.addEventListener("click", (evento) => {

                evento.preventDefault();

                encerrarSessao();
            });
        }

        // Verificar autenticação ao abrir a página
        verificarAcesso();

    });

})();