import AuthMiddleware from "../middlewares/authMiddleware.js";
import UsersRepository from "../repositories/usersRepository.js";

export default class AuthController {

  #usersRepository;

  constructor() {
    this.#usersRepository = new UsersRepository();
  }

  // POST /autenticacao/token
  async token(req, res) {
    try {
      let { email, senha } = req.body;

      if (!email || !senha)
        return res.status(400).json({ msg: "Informe um e-mail e uma senha para gerar um token de acesso!" });

      // você pode criar esse método validarAcesso no repo
      let usuario = await this.#usersRepository.validarAcesso(email, senha);

      if (!usuario)
        return res.status(404).json({ msg: "Usuário não encontrado" });

      let auth = new AuthMiddleware();
      let token = auth.gerarToken(
        usuario.id,
        usuario.nome,
        usuario.email,
        usuario.perfil,
        usuario.isConsultora
      );

      res.cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
        maxAge: 3000 * 1000
      });

      // devolve token também (pra usar no Swagger Authorize)
      return res.status(200).json({ msg: "Login realizado com sucesso", token });

    } catch (exception) {
      console.log(exception);
      return res.status(500).json({ msg: "Erro ao gerar token de acesso" });
    }
  }

  // GET /autenticacao/usuario
  async usuario(req, res) {
    try {
      if (req.usuarioLogado)
        return res.status(200).json(req.usuarioLogado);

      return res.status(401).json({ msg: "Não autenticado" });

    } catch (ex) {
      console.log(ex);
      return res.status(500).json({ msg: "Erro ao obter usuário logado" });
    }
  }
}