const usuario = JSON.parse(sessionStorage.getItem("usuario"));

if (!usuario || usuario.perfil !== "tecnico") {
alert("Acesso negado! Faça login com uma conta de técnico.");
window.location.href = "../tela-login/index.html";
} else {
const botoesSair = document.querySelectorAll("[data-sair]");

botoesSair.forEach((botao) => {
    botao.addEventListener("click", function (evento) {
        evento.preventDefault();
        sessionStorage.removeItem("usuario");
        window.location.href = "../tela-login/index.html";
    });
});

}