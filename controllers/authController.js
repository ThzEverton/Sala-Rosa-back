import AuthMiddleware from "../middlewares/authMiddleware.js";
import UsersRepository from "../repositories/usersRepository.js";
import { enviarEmail } from "../services/emailService.js";
import crypto from "crypto";

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

  #gerarTokenResetSenha() {
    return crypto.randomBytes(32).toString("hex");
  }

  #gerarHashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  #escaparHtml(valor) {
    return String(valor || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  #montarHtmlResetSenha(usuario, link, minutosValidade) {
    const nome = this.#escaparHtml(usuario.nome || "cliente");

    return `
      <div style="font-family: Arial, sans-serif; color: #2b2b2b; line-height: 1.5;">
        <h2 style="color: #b25b7f;">Redefinição de senha - Sala Rosa</h2>
        <p>Olá, ${nome}.</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <p>
          <a href="${link}" style="display: inline-block; background: #b25b7f; color: #ffffff; padding: 12px 18px; text-decoration: none; border-radius: 6px;">
            Redefinir minha senha
          </a>
        </p>
        <p>Este link expira em ${minutosValidade} minutos.</p>
        <p>Se você não pediu essa alteração, pode ignorar este e-mail.</p>
      </div>
    `;
  }

  // POST /autenticacao/esqueci-senha
  async esqueciSenha(req, res) {
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();

      if (!email)
        return res.status(400).json({ msg: "Informe o e-mail para recuperar a senha." });

      const respostaPadrao = {
        msg: "Se o e-mail estiver cadastrado, enviaremos as instruções para redefinir a senha."
      };

      const usuario = await this.#usersRepository.obterPorEmail(email);

      if (!usuario || !usuario.ativo)
        return res.status(200).json(respostaPadrao);

      const minutosValidade = Number(process.env.RESET_PASSWORD_TOKEN_MINUTES || 30);
      const token = this.#gerarTokenResetSenha();
      const tokenHash = this.#gerarHashToken(token);

      await this.#usersRepository.criarTokenResetSenha(
        usuario.id,
        tokenHash,
        minutosValidade
      );

      const frontendUrl = (
        process.env.FRONTEND_URL ||
        process.env.APP_URL ||
        "http://localhost:3000"
      ).replace(/\/$/, "");

      const link = `${frontendUrl}/redefinir-senha?token=${token}`;
      const html = this.#montarHtmlResetSenha(usuario, link, minutosValidade);

      await enviarEmail(
        usuario.email,
        "Redefinição de senha - Sala Rosa",
        html
      );

      return res.status(200).json(respostaPadrao);
    } catch (exception) {
      console.log(exception);
      return res.status(500).json({ msg: "Erro ao solicitar redefinição de senha" });
    }
  }

  // POST /autenticacao/redefinir-senha
  async redefinirSenha(req, res) {
    try {
      const token = String(req.body?.token || "").trim();
      const senha = String(req.body?.senha || "");

      if (!token || !senha)
        return res.status(400).json({ msg: "Informe o token e a nova senha." });

      if (senha.length < 3)
        return res.status(400).json({ msg: "A senha deve ter pelo menos 3 caracteres." });

      const tokenHash = this.#gerarHashToken(token);
      const reset = await this.#usersRepository.obterTokenResetSenhaValido(tokenHash);

      if (!reset || Number(reset.ativo) !== 1)
        return res.status(400).json({ msg: "Token inválido ou expirado." });

      await this.#usersRepository.atualizarSenha(reset.user_id, senha);
      await this.#usersRepository.marcarTokenResetSenhaComoUsado(reset.id);

      return res.status(200).json({ msg: "Senha redefinida com sucesso." });
    } catch (exception) {
      console.log(exception);
      return res.status(500).json({ msg: "Erro ao redefinir senha" });
    }
  }
}
