function verificarPerfil(...perfisPermitidos) {
    return (req, res, next) => {
        // Verificar se o usuário está autenticado
        if (!req.usuario) {
            return res.status(401).json({
                mensagem: "Usuário não autenticado."
            });
        }

        // Verificar permissão do perfil
        if (!perfisPermitidos.includes(req.usuario.perfil)) {
            return res.status(403).json({
                mensagem: "Você não tem permissão para realizar esta ação."
            });
        }

        next();
    };
}

module.exports = verificarPerfil;