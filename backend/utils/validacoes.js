function idValido(id) {
    return /^[1-9]\d*$/.test(String(id));
}

function emailValido(email) {
    return typeof email === "string" &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function senhaValida(senha) {
    return typeof senha === "string" &&
        senha.length >= 8 &&
        /[A-Z]/.test(senha) &&
        /[a-z]/.test(senha) &&
        /\d/.test(senha);
}

function cpfValido(cpf) {
    if (typeof cpf !== "string") return false;

    const numeros = cpf.replace(/\D/g, "");

    if (!/^\d{11}$/.test(numeros) ||
        /^(\d)\1{10}$/.test(numeros)) {
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

module.exports = {
    idValido,
    emailValido,
    senhaValida,
    cpfValido
};