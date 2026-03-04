export default class AuthMiddleware {
    validarToken(req, res, next) {
      const authHeader = req.headers["authorization"];
  
      if (!authHeader) return res.status(401).json({ msg: "Token não informado." });
  
      const token = authHeader.split(" ")[1];
  
      if (!token) return res.status(401).json({ msg: "Token inválido." });
  
      req.usuarioLogado = { id: 1, perfil: "gerente", is_consultora: 0 };
  
      next();
    }
  }