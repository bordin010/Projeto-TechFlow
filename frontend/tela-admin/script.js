const usuario = JSON.parse(sessionStorage.getItem("usuario"));
const token = sessionStorage.getItem("token");

if (!usuario || usuario.perfil !== "admin" || !token) {
    alert("Acesso negado! Faça login com uma conta de administrador.");

    sessionStorage.removeItem("usuario");
    sessionStorage.removeItem("token");

    window.location.href = "../tela-login/index.html";
} else {
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

// ==============================
// REQUISIÇÕES AUTENTICADAS
// ==============================

async function requisicaoAutenticada(url, opcoes = {}) {
    const tokenAtual = sessionStorage.getItem("token");

    if (!tokenAtual) {
        sessionStorage.removeItem("usuario");
        sessionStorage.removeItem("token");

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

// ==============================
// ORDENS DE SERVIÇO
// ==============================

async function carregarOrdensServico() {
    const listaOrdens = document.getElementById("lista-ordens");
    const ordensRecentes = document.getElementById("ordens-recentes");
    const mensagem = document.getElementById("mensagem");

    try {
        const resposta = await requisicaoAutenticada(
            "http://localhost:3000/api/ordens-servico"
        );

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar as ordens de serviço.");
        }

        const ordens = await resposta.json();

        const total = document.getElementById("total");
        const pendentes = document.getElementById("pendentes");
        const concluidas = document.getElementById("concluidas");

        const quantidadePendentes = ordens.filter(ordem =>
            ["Aberta", "Aguardando", "Pendente"].includes(ordem.status)
        ).length;

        const quantidadeConcluidas = ordens.filter(ordem =>
            ordem.status === "Concluída"
        ).length;

        const quantidadeAndamento = ordens.filter(ordem =>
            ordem.status === "Em andamento"
        ).length;

        if (total) total.textContent = ordens.length;
        if (pendentes) pendentes.textContent = quantidadePendentes;
        if (concluidas) concluidas.textContent = quantidadeConcluidas;

        const percentual = ordens.length > 0
            ? Math.round((quantidadeConcluidas / ordens.length) * 100)
            : 0;

        const percentualElemento =
            document.getElementById("percentual-conclusao");

        const progresso =
            document.getElementById("progresso-conclusao");

        const resumo =
            document.getElementById("resumo-andamento");

        if (percentualElemento) {
            percentualElemento.textContent = `${percentual}%`;
        }

        if (progresso) {
            progresso.value = percentual;
        }

        if (resumo) {
            resumo.textContent =
                `${quantidadeAndamento} atendimento(s) em andamento.`;
        }

        function classeStatus(status) {
            if (status === "Concluída") return "concluida";
            if (status === "Em andamento") return "andamento";
            if (status === "Cancelada") return "cancelada";

            return "pendente";
        }

        // Monta a tabela de todas as ordens.
        if (listaOrdens) {
            listaOrdens.replaceChildren();

            ordens.forEach(ordem => {
                const linha = document.createElement("tr");

                linha.className =
                    `linha-os ${classeStatus(ordem.status)}`;

                const equipamento = [
                    ordem.tipo_equipamento,
                    ordem.marca_equipamento,
                    ordem.modelo_equipamento
                ].filter(Boolean).join(" ");

                const valores = [
                    `#${ordem.id_os}`,
                    ordem.nome_cliente || "Cliente não informado",
                    ordem.descricao || equipamento || "Não informado",
                    ordem.nome_tecnico || "Não atribuído",
                    ordem.status || "Sem status"
                ];

                valores.forEach((valor, indice) => {
                    const celula = document.createElement("td");

                    if (indice === 4) {
                        const etiqueta = document.createElement("span");

                        etiqueta.className =
                            `situacao ${classeStatus(ordem.status)}`;

                        etiqueta.textContent = valor;
                        celula.appendChild(etiqueta);
                    } else {
                        celula.textContent = valor;
                    }

                    linha.appendChild(celula);
                });

                const celulaAcao = document.createElement("td");
                celulaAcao.textContent = "—";

                linha.appendChild(celulaAcao);
                listaOrdens.appendChild(linha);
            });
        }

        // Monta a tabela de ordens recentes.
        if (ordensRecentes) {
            ordensRecentes.replaceChildren();

            ordens.slice(0, 3).forEach(ordem => {
                const linha = document.createElement("tr");

                const celulaId = document.createElement("td");
                celulaId.textContent = `#${ordem.id_os}`;

                const celulaCliente = document.createElement("td");
                celulaCliente.textContent =
                    ordem.nome_cliente || "Não informado";

                const celulaStatus = document.createElement("td");
                const etiqueta = document.createElement("span");

                etiqueta.className =
                    `situacao ${classeStatus(ordem.status)}`;

                etiqueta.textContent = ordem.status || "Sem status";

                celulaStatus.appendChild(etiqueta);

                linha.append(
                    celulaId,
                    celulaCliente,
                    celulaStatus
                );

                ordensRecentes.appendChild(linha);
            });
        }

        // ==============================
        // FILTRO DE STATUS E BUSCA
        // ==============================

        const filtroStatus = document.getElementById("filtro-status");
        const campoBusca = document.getElementById("busca");

        if ((filtroStatus || campoBusca) && listaOrdens) {
            const filtrarOrdens = () => {
                const filtro = filtroStatus
                    ? filtroStatus.value
                    : "todos";

                const termoBusca = campoBusca
                    ? campoBusca.value.trim().toLocaleLowerCase("pt-BR")
                    : "";

                let totalVisivel = 0;

                listaOrdens.querySelectorAll("tr").forEach(linha => {
                    const status =
                        linha.querySelector(".situacao")?.textContent.trim();

                    const textoLinha =
                        linha.textContent.toLocaleLowerCase("pt-BR");

                    const correspondeStatus = filtro === "todos"
                        || (
                            filtro === "pendente"
                            && ["Aberta", "Aguardando", "Pendente"].includes(status)
                        )
                        || (
                            filtro === "andamento"
                            && status === "Em andamento"
                        )
                        || (
                            filtro === "concluida"
                            && status === "Concluída"
                        );

                    const correspondeBusca =
                        textoLinha.includes(termoBusca);

                    const exibir =
                        correspondeStatus && correspondeBusca;

                    linha.hidden = !exibir;

                    if (exibir) {
                        totalVisivel++;
                    }
                });

                if (mensagem) {
                    if (termoBusca) {
                        mensagem.textContent =
                            `${totalVisivel} ordem(ns) encontrada(s).`;
                    } else {
                        mensagem.textContent =
                            `${totalVisivel} ordem(ns) exibida(s).`;
                    }
                }
            };

            if (filtroStatus) {
                filtroStatus.addEventListener("change", filtrarOrdens);
            }

            if (campoBusca) {
                campoBusca.addEventListener("input", filtrarOrdens);
            }

            filtrarOrdens();
        }

        if (mensagem) {
            mensagem.textContent =
                `${ordens.length} ordem(ns) carregada(s) do banco de dados.`;
        }

    } catch (erro) {
        console.error("Erro ao carregar ordens:", erro);

        if (mensagem) {
            mensagem.textContent =
                "Não foi possível carregar as ordens. Verifique a conexão com o servidor.";
        }
    }
}

carregarOrdensServico();

// ==============================
// TÉCNICOS
// ==============================

async function carregarTecnicos() {
    const listaTecnicos = document.getElementById("lista-tecnicos");

    if (!listaTecnicos) return;

    try {
        const resposta = await requisicaoAutenticada(
            "http://localhost:3000/api/tecnicos"
        );

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar os técnicos.");
        }

        const tecnicos = await resposta.json();

        listaTecnicos.replaceChildren();

        if (tecnicos.length === 0) {
            const item = document.createElement("li");
            item.textContent = "Nenhum técnico cadastrado.";

            listaTecnicos.appendChild(item);
        } else {
            tecnicos.forEach(tecnico => {
                const item = document.createElement("li");
                const informacoes = document.createElement("div");

                const nome = document.createElement("strong");
                nome.textContent = tecnico.nome;

                const detalhes = document.createElement("span");

                detalhes.textContent = [
                    tecnico.especialidade,
                    tecnico.email,
                    tecnico.telefone
                ].filter(Boolean).join(" · ");

                informacoes.append(nome, detalhes);

                const botaoEditar = document.createElement("button");

                botaoEditar.type = "button";
                botaoEditar.className = "botao botao-secundario";
                botaoEditar.textContent = "Editar";

                botaoEditar.addEventListener("click", () => {
                    editarTecnico(tecnico);
                });

                item.append(informacoes, botaoEditar);
                listaTecnicos.appendChild(item);
            });
        }

    } catch (erro) {
        console.error("Erro ao carregar técnicos:", erro);

        listaTecnicos.replaceChildren();

        const item = document.createElement("li");
        item.textContent = "Não foi possível carregar os técnicos.";

        listaTecnicos.appendChild(item);
    }
}

carregarTecnicos();

// ==============================
// CLIENTES
// ==============================

async function carregarClientes() {
    const listaClientes = document.getElementById("lista-clientes");

    if (!listaClientes) return;

    try {
        const resposta = await requisicaoAutenticada(
            "http://localhost:3000/api/clientes"
        );

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar os clientes.");
        }

        const clientes = await resposta.json();

        listaClientes.replaceChildren();

        if (clientes.length === 0) {
            const item = document.createElement("li");
            item.textContent = "Nenhum cliente cadastrado.";

            listaClientes.appendChild(item);
            return;
        }

        clientes.forEach(cliente => {
            const item = document.createElement("li");

            const nome = document.createElement("strong");
            nome.textContent = cliente.nome || "Nome não informado";

            const contato = document.createElement("span");

            const dadosContato = [
                cliente.email,
                cliente.telefone,
                cliente.endereco
            ].filter(Boolean);

            contato.textContent = dadosContato.length > 0
                ? dadosContato.join(" · ")
                : "Sem informações de contato";

            item.append(nome, contato);
            listaClientes.appendChild(item);
        });

    } catch (erro) {
        console.error("Erro ao carregar clientes:", erro);

        listaClientes.replaceChildren();

        const item = document.createElement("li");
        item.textContent = "Não foi possível carregar os clientes.";

        listaClientes.appendChild(item);
    }
}

carregarClientes();

// ==============================
// EQUIPAMENTOS
// ==============================

async function carregarEquipamentos() {
    const listaEquipamentos =
        document.getElementById("lista-equipamentos");

    if (!listaEquipamentos) return;

    try {
        const resposta = await requisicaoAutenticada(
            "http://localhost:3000/api/equipamentos"
        );

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar os equipamentos.");
        }

        const equipamentos = await resposta.json();

        listaEquipamentos.replaceChildren();

        if (equipamentos.length === 0) {
            const item = document.createElement("li");
            item.textContent = "Nenhum equipamento cadastrado.";

            listaEquipamentos.appendChild(item);
            return;
        }

        equipamentos.forEach(equipamento => {
            const item = document.createElement("li");

            const titulo = document.createElement("strong");

            titulo.textContent = [
                equipamento.tipo,
                equipamento.marca,
                equipamento.modelo
            ].filter(Boolean).join(" ");

            const detalhes = document.createElement("span");

            const informacoes = [
                equipamento.numero_serie
                    ? `Nº de série: ${equipamento.numero_serie}`
                    : null,
                equipamento.nome_cliente
                    ? `Cliente: ${equipamento.nome_cliente}`
                    : null
            ].filter(Boolean);

            detalhes.textContent = informacoes.length > 0
                ? informacoes.join(" · ")
                : `Equipamento #${equipamento.id_equipamento}`;

            item.append(titulo, detalhes);
            listaEquipamentos.appendChild(item);
        });

    } catch (erro) {
        console.error("Erro ao carregar equipamentos:", erro);

        listaEquipamentos.replaceChildren();

        const item = document.createElement("li");
        item.textContent = "Não foi possível carregar os equipamentos.";

        listaEquipamentos.appendChild(item);
    }
}

carregarEquipamentos();

// ==============================
// CADASTRAR E EDITAR TÉCNICOS
// ==============================

const formularioTecnico =
    document.getElementById("formulario-tecnico");

if (formularioTecnico) {
    formularioTecnico.addEventListener("submit", async function (evento) {
        evento.preventDefault();

        const mensagemTecnico =
            document.getElementById("mensagem-tecnico");

        const botaoEnviar =
            formularioTecnico.querySelector('button[type="submit"]');

        const campoNome = document.getElementById("nome-tecnico");
        const campoEmail = document.getElementById("email-tecnico");
        const campoSenha = document.getElementById("senha-tecnico");

        const campoEspecialidade =
            document.getElementById("especialidade-tecnico");

        const campoTelefone =
            document.getElementById("telefone-tecnico");

        const idTecnico = formularioTecnico.dataset.idTecnico;

        const dadosTecnico = {
            nome: campoNome.value.trim(),
            email: campoEmail.value.trim(),
            especialidade: campoEspecialidade.value.trim(),
            telefone: campoTelefone.value.trim(),
            senha: campoSenha.value
        };

        if (!dadosTecnico.nome || !dadosTecnico.email) {
            mensagemTecnico.textContent = "Preencha o nome e o e-mail.";
            return;
        }

        if (!idTecnico && !dadosTecnico.senha) {
            mensagemTecnico.textContent =
                "Informe uma senha para o novo técnico.";
            return;
        }

        if (!idTecnico && dadosTecnico.senha.length < 8) {
            mensagemTecnico.textContent =
                "A senha deve ter pelo menos 8 caracteres.";
            return;
        }

        if (idTecnico && dadosTecnico.senha) {
            mensagemTecnico.textContent =
                "A edição de senha ainda não está disponível. Deixe o campo de senha vazio.";
            return;
        }

        botaoEnviar.disabled = true;

        mensagemTecnico.textContent = idTecnico
            ? "Salvando alterações..."
            : "Cadastrando técnico...";

        try {
            const url = idTecnico
                ? `http://localhost:3000/api/tecnicos/${idTecnico}`
                : "http://localhost:3000/api/tecnicos";

            const metodo = idTecnico ? "PUT" : "POST";

            const resposta = await requisicaoAutenticada(url, {
                method: metodo,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(dadosTecnico)
            });

            const resultado = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    resultado.erro ||
                    "Não foi possível salvar os dados do técnico."
                );
            }

            formularioTecnico.reset();
            delete formularioTecnico.dataset.idTecnico;

            campoSenha.required = true;
            botaoEnviar.textContent = "Adicionar técnico";

            mensagemTecnico.textContent = resultado.mensagem ||
                (idTecnico
                    ? "Técnico atualizado com sucesso!"
                    : "Técnico cadastrado com sucesso!");

            mensagemTecnico.setAttribute("role", "status");

            mensagemTecnico.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            await carregarTecnicos();

            mensagemTecnico.textContent = resultado.mensagem ||
                (idTecnico
                    ? "Técnico atualizado com sucesso!"
                    : "Técnico cadastrado com sucesso!");

        } catch (erro) {
            console.error("Erro ao salvar técnico:", erro);
            mensagemTecnico.textContent = erro.message;

        } finally {
            botaoEnviar.disabled = false;
        }
    });
}

// Preenche o formulário para editar um técnico.
function editarTecnico(tecnico) {
    const nome = document.getElementById("nome-tecnico");
    const email = document.getElementById("email-tecnico");
    const senha = document.getElementById("senha-tecnico");

    const especialidade =
        document.getElementById("especialidade-tecnico");

    const telefone =
        document.getElementById("telefone-tecnico");

    const formulario =
        document.getElementById("formulario-tecnico");

    const mensagem =
        document.getElementById("mensagem-tecnico");

    nome.value = tecnico.nome || "";
    email.value = tecnico.email || "";
    senha.value = "";
    especialidade.value = tecnico.especialidade || "";
    telefone.value = tecnico.telefone || "";

    senha.required = false;

    formulario.dataset.idTecnico = tecnico.id_tecnico;

    const botao =
        formulario.querySelector('button[type="submit"]');

    botao.textContent = "Salvar alterações";

    mensagem.textContent =
        `Editando o cadastro de ${tecnico.nome}. Preencha as alterações e clique em Salvar alterações.`;

    formulario.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    nome.focus();
}