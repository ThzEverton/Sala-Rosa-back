import UsersRepository from "../repositories/usersRepository.js";
import Usuario from "../entities/User.js";
import { enviarEmail } from "../services/emailService.js";

export default class UsersController {
  #repo;

  constructor() {
    this.#repo = new UsersRepository();
  }

  #escaparHtml(valor) {
    return String(valor || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  #montarHtmlBoasVindas(usuario) {
    const nome = this.#escaparHtml(usuario.nome);
    const siteUrl = process.env.FRONTEND_URL || "https://melissamartelli.com.br";

    return `
      <div style="font-family: Arial, sans-serif; color: #2b2b2b; line-height: 1.5;">
        <h2 style="color: #d04482;">Bem-vinda ao Sala Rosa!</h2>
        <p>Olá, ${nome}.</p>
        <p>Seu cadastro foi realizado com sucesso. Agora você já pode acessar sua conta pelo link abaixo:</p>
        <p>
          <a href="${siteUrl}/login" style="display: inline-block; background: #d04482; color: #ffffff; padding: 10px 16px; border-radius: 8px; text-decoration: none;">
            Acessar minha conta
          </a>
        </p>
        <p>Se você não realizou esse cadastro, ignore este e-mail.</p>
        <p style="font-size: 12px; color: #777;">Sala Rosa</p>
      </div>
    `;
  }

  async #enviarEmailBoasVindas(usuario) {
    try {
      await enviarEmail(
        usuario.email,
        "Bem-vinda ao Sala Rosa",
        this.#montarHtmlBoasVindas(usuario)
      );
    } catch (erro) {
      console.error("Erro ao enviar e-mail de boas-vindas:", erro);
    }
  }

  // GET /users
  async listar(req, res) {
    try {
      const lista = await this.#repo.listar();
      return res.status(200).json(lista);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ msg: "Erro ao listar usuários." });
    }
  }

  // GET /users/:id
  async obter(req, res) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ msg: "Id inválido." });

      const user = await this.#repo.obterPorId(id);
      if (!user) return res.status(404).json({ msg: "Usuário não encontrado." });

      return res.status(200).json(user);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ msg: "Erro ao obter usuário." });
    }
  }

  // POST /users
  async criar(req, res) {
    try {
      const {
        nome,
        email,
        telefone,
        dataNascimento,
        perfil,
        isConsultora,
        ativo,
        senha
      } = req.body;

      if (!nome || nome.trim().length < 2) {
        return res.status(400).json({ msg: "Nome inválido." });
      }

      if (!email || !email.includes("@")) {
        return res.status(400).json({ msg: "Email inválido." });
      }

      if (!senha) {
        return res.status(400).json({ msg: "Senha é obrigatória." });
      }

      let u = new Usuario();
      u.nome = nome.trim();
      u.email = email.trim();
      u.telefone = telefone || null;
      u.dataNascimento = dataNascimento || null;
      u.perfil = perfil || "cliente";
      u.isConsultora = isConsultora ? 1 : 0;
      u.ativo = ativo === undefined ? 1 : (ativo ? 1 : 0);
      u.senha = senha;

      const result = await this.#repo.criar(u);

      if (!result) {
        return res.status(400).json({ msg: "Não foi possível criar usuário." });
      }

      await this.#enviarEmailBoasVindas(u);

      return res.status(201).json({
        msg: "Usuário criado.",
        id: result.insertId
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ msg: "Erro ao criar usuário." });
    }
  }
  // PUT /users/:id
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const { nome, email, telefone, dataNascimento, perfil, isConsultora, ativo, senha } = req.body;

      if (!id) return res.status(400).json({ msg: "Id inválido." });

      const atual = await this.#repo.obterPorId(id);
      if (!atual) return res.status(404).json({ msg: "Usuário não encontrado." });

      if (nome !== undefined) atual.nome = nome;
      if (email !== undefined) atual.email = email;
      if (telefone !== undefined) atual.telefone = telefone;
      if (dataNascimento !== undefined) atual.dataNascimento = dataNascimento;
      if (perfil !== undefined) atual.perfil = perfil;
      if (isConsultora !== undefined) atual.isConsultora = isConsultora ? 1 : 0;
      if (ativo !== undefined) atual.ativo = ativo ? 1 : 0;
      if (senha !== undefined && String(senha).trim()) atual.senha = String(senha);

      const ok = await this.#repo.atualizar(atual);
      if (!ok) return res.status(400).json({ msg: "Não foi possível atualizar usuário." });

      return res.status(200).json({ msg: "Usuário atualizado." });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ msg: "Erro ao atualizar usuário." });
    }
  }

  // PATCH /users/:id/toggle-ativo
  async toggleAtivo(req, res) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ msg: "Id inválido." });

      const ok = await this.#repo.toggleAtivo(id);
      if (!ok) return res.status(404).json({ msg: "Usuário não encontrado." });

      return res.status(200).json({ msg: "Status alterado." });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ msg: "Erro ao alterar status do usuário." });
    }
  }
}
