import jwt from "jsonwebtoken";
import UsersRepository from "../repositories/usersRepository.js";

const SECRET = "FIPP21_SECRET_2025";

export default class AuthMiddleware {

  gerarToken(id, nome, email, perfil, isConsultora) {
    return jwt.sign(
      {
        id,
        nome,
        email,
        perfil,
        isConsultora: isConsultora ? 1 : 0
      },
      SECRET,
      { expiresIn: 3000 }
    );
  }

  async validarToken(req, res, next) {
    let token = null;

    // 1) cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // 2) header Bearer
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer")
        token = parts[1];
    }

    if (!token)
      return res.status(401).json({ msg: "Token não encontrado!" });

    try {
      const payload = jwt.verify(token, SECRET);

      const repo = new UsersRepository();
      const usuario = await repo.obterPorId(payload.id);

      if (!usuario)
        return res.status(404).json({ msg: "Usuário não encontrado" });

      req.usuarioLogado = usuario;
      next();

    } catch (ex) {
      console.log(ex);
      return res.status(401).json({ msg: "Token inválido!" });
    }
  }
}