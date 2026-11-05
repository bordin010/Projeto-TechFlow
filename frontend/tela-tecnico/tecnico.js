// Proteção da área do técnico - TechFlow

(() => {
    const caminhoLogin = "../tela-login/index.html";

    // Ocultar o painel até validar a autenticação
    document.documentElement.style.visibility = "hidden";

    // Encerrar sessão
    function sairDoSistema() {
        sessionStorage.removeItem("techflow_token");
        sessionStorage.removeItem("techflow_usuario");

        window.location.replace(caminhoLogin);
    }

    // Verificar autenticação e permissões
    async function verificarAcesso() {
        const token = sessionStorage.getItem("techflow_token");

        if (!token) {
            sairDoSistema();
            return;
        }

        try {
            // Consultar a rota específica de validação
            const resposta = await fetch("/api/auth/sessao", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                cache: "no-store"
            });

            // Sessão inválida, expirada ou usuário desativado
            if (resposta.status === 401 || resposta.status === 403) {
                sairDoSistema();
                return;
            }

            if (!resposta.ok) {
                throw new Error("Falha ao verificar a sessão.");
            }

            const dados = await resposta.json();

            // Conferir o perfil verdadeiro no banco de dados
            if (
                !dados.usuario ||
                dados.usuario.perfil !== "tecnico"
            ) {
                sairDoSistema();
                return;
            }

            // Recuperar informações do usuário
            let usuarioSalvo = {};

            try {
                usuarioSalvo = JSON.parse(
                    sessionStorage.getItem("techflow_usuario")
                ) || {};
            } catch (erro) {
                usuarioSalvo = {};
            }

            const nome = usuarioSalvo.nomeCompleto || "Técnico";

            // Mostrar nome na parte superior
            const nomeTopo = document.getElementById("nome-topo");

            if (nomeTopo) {
                nomeTopo.textContent = nome;
            }

            // Personalizar saudação
            const saudacao = document.getElementById("saudacao-tecnico");

            if (saudacao) {
                saudacao.textContent = `Olá, ${nome}.`;
            }

            // Liberar visualização do painel
            document.documentElement.style.visibility = "visible";

        } catch (erro) {
            console.error("Erro ao verificar sessão:", erro);

            document.body.textContent =
                "Não foi possível validar sua sessão. Verifique o servidor e atualize a página.";

            document.documentElement.style.visibility = "visible";
        }
    }

    document.addEventListener("DOMContentLoaded", () => {

        // Configurar os dois botões de sair
        document.querySelectorAll("[data-sair]").forEach((botao) => {
            botao.addEventListener("click", (evento) => {
                evento.preventDefault();
                sairDoSistema();
            });
        });

        // Validar acesso ao abrir o painel
        verificarAcesso();
    });

})();