const API_URL = "http://localhost:3000/api";

// Recupera os dados da sessão
const token = sessionStorage.getItem("token");
const usuarioSalvo = sessionStorage.getItem("usuario");

let usuario = null;

try {
    usuario = usuarioSalvo ? JSON.parse(usuarioSalvo) : null;
} catch {
    usuario = null;
}

// Verifica a autenticação do cliente
if (
    !token ||
    !usuario ||
    usuario.perfil !== "cliente" ||
    !usuario.id_cliente
) {
    alert("Faça login na sua conta de cliente para solicitar um serviço.");
    window.location.href = "../tela-cliente/index.html";
}

// Elementos do formulário
const formularioServico = document.getElementById("formulario-servico");
const mensagemFormulario = document.getElementById("mensagem-formulario");
const botaoEnviar = formularioServico.querySelector(
    'button.botao-finalizar[type="submit"]'
);
const botaoEnviarResumo = document.getElementById("enviar-resumo");

// Impede que o formulário funcione se os elementos necessários não existirem
if (!formularioServico || !mensagemFormulario || !botaoEnviar) {
    console.error("Não foi possível localizar os elementos do formulário.");
}

// Exibe mensagens para o cliente
function mostrarMensagem(texto, tipo = "erro") {
    mensagemFormulario.textContent = texto;

    if (tipo === "sucesso") {
        mensagemFormulario.style.color = "#198754";
    } else if (tipo === "info") {
        mensagemFormulario.style.color = "#333333";
    } else {
        mensagemFormulario.style.color = "#dc3545";
    }
}

// Captura os dados preenchidos
function obterDadosFormulario() {
    const dados = new FormData(formularioServico);

    const equipamentoTexto = dados.get("equipamento")?.trim() || "";

    return {
        categoria: dados.get("categoria"),
        equipamentoTexto,
        servico: dados.get("servico"),
        problema: dados.get("problema")?.trim() || "",
        nome: dados.get("nome")?.trim() || "",
        telefone: dados.get("telefone")?.trim() || "",
        email: document.getElementById("email")?.value.trim() || "",
        modalidade: dados.get("modalidade"),
        endereco: dados.get("endereco")?.trim() || "",
        data: dados.get("data"),
        periodo: dados.get("periodo")
    };
}

// Cadastra o equipamento do cliente
async function cadastrarEquipamento(dados) {
    const resposta = await fetch(`${API_URL}/equipamentos`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            tipo: dados.categoria,
            marca: "Não informada",
            modelo: dados.equipamentoTexto,
            numero_serie: null
        })
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
        throw new Error(
            resultado.erro || "Não foi possível cadastrar o equipamento."
        );
    }

    return resultado.id_equipamento;
}

// Monta a descrição da ordem de serviço
function montarDescricao(dados) {
    return [
        `Categoria: ${dados.categoria}`,
        `Equipamento informado: ${dados.equipamentoTexto}`,
        `Serviço solicitado: ${dados.servico}`,
        `Problema relatado: ${dados.problema}`,
        `Modalidade: ${dados.modalidade}`,
        `Endereço: ${dados.endereco || "Não informado"}`,
        `Data preferida: ${dados.data}`,
        `Período preferido: ${dados.periodo}`,
        `Nome do cliente: ${dados.nome}`,
        `Telefone: ${dados.telefone}`,
        `E-mail: ${dados.email}`
    ].join("\n");
}

// Registra a ordem de serviço
async function registrarOrdemServico(dados, idEquipamento) {
    const resposta = await fetch(`${API_URL}/ordens-servico`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            descricao: montarDescricao(dados),
            prioridade: "media",
            id_equipamento: idEquipamento,
            id_status: 1
        })
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
        throw new Error(
            resultado.erro ||
            "Não foi possível registrar a ordem de serviço."
        );
    }

    return resultado;
}

// Controla o envio do formulário
let enviando = false;

async function processarSolicitacao(event) {
    event.preventDefault();

    // Evita envios simultâneos pelos dois botões
    if (enviando) {
        return;
    }

    // Valida os campos obrigatórios
    if (!formularioServico.checkValidity()) {
        formularioServico.reportValidity();
        return;
    }

    const dados = obterDadosFormulario();

    // Valida o endereço para atendimento em domicílio
    if (
        dados.modalidade === "domicilio" &&
        !dados.endereco
    ) {
        mostrarMensagem(
            "Informe o endereço completo para atendimento em domicílio."
        );

        document.getElementById("endereco").focus();
        return;
    }

    // Confere a sessão
    if (!token || !usuario || !usuario.id_cliente) {
        mostrarMensagem(
            "Sua sessão expirou. Faça login novamente."
        );
        return;
    }

    enviando = true;

    botaoEnviar.disabled = true;

    if (botaoEnviarResumo) {
        botaoEnviarResumo.disabled = true;
    }

    botaoEnviar.innerHTML = "Enviando...";

    mostrarMensagem(
        "Enviando sua solicitação...",
        "info"
    );

    try {
        // 1. Cadastra o equipamento
        const idEquipamento = await cadastrarEquipamento(dados);

        // 2. Registra a ordem de serviço
        const resultado = await registrarOrdemServico(
            dados,
            idEquipamento
        );

        // 3. Confirma o registro
        mostrarMensagem(
            `Solicitação registrada com sucesso! Protocolo: OS-${resultado.id_os}`,
            "sucesso"
        );

        formularioServico.reset();

    } catch (erro) {
        console.error("Erro ao enviar solicitação:", erro);

        mostrarMensagem(
            erro.message ||
            "Ocorreu um erro ao enviar a solicitação."
        );

    } finally {
        enviando = false;

        botaoEnviar.disabled = false;
        botaoEnviar.innerHTML =
            'Enviar solicitação <span>↗</span>';

        if (botaoEnviarResumo) {
            botaoEnviarResumo.disabled = false;
        }
    }
}

// Envio pelo botão principal
formularioServico.addEventListener(
    "submit",
    processarSolicitacao
);

// Envio pelo botão do resumo
if (botaoEnviarResumo) {
    botaoEnviarResumo.addEventListener("click", () => {
        formularioServico.requestSubmit();
    });
}