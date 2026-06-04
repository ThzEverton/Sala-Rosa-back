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
    const siteUrl = (process.env.FRONTEND_URL || "https://melissamartelli.com.br").replace(/\/$/, "");

    return `
      <div style="margin:0; padding:0; background:#f8f4f6;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f4f6; padding:18px 8px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:760px; background:#ffffff; border-radius:18px; overflow:hidden; font-family:Arial,Helvetica,sans-serif; color:#2b2b2b; border:1px solid #efd5de;">
                <tr>
                  <td align="center" style="background:#bd4668; background:linear-gradient(180deg,#cf5d7c 0%,#b83f62 100%); padding:30px 34px 26px;">
                    <div style="font-size:26px; line-height:1.2; color:#ffffff; font-weight:700;">Sala Rosa</div>
                    <div style="margin-top:6px; font-size:11px; line-height:1.4; color:#ffe9ef; font-weight:700; letter-spacing:.7px; text-transform:uppercase;">Espaço de beleza e bem-estar</div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:30px 36px 24px; border-bottom:1px solid #f0dbe2;">
                    <p style="margin:0 0 8px; font-size:12px; color:#8a6473; font-weight:700;">Uma mensagem especial para você</p>
                    <h1 style="margin:0; font-size:28px; line-height:1.22; color:#171214;">Bem-vinda, ${nome}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:30px 42px 12px; border-bottom:1px dashed #ead3dc;">
                    <p style="margin:0 0 14px; font-size:16px; line-height:1.75; color:#2f2a2d;">Estamos muito felizes em ter você conosco. Seu cadastro foi realizado com sucesso e agora você já pode acessar sua conta.</p>
                    <div style="margin:22px 0 18px; background:#fff1f5; border-left:5px solid #cf4d72; border-radius:12px; padding:18px 20px;">
                      <p style="margin:0; font-size:15px; line-height:1.65; color:#6f2f47; font-weight:700;">A Sala Rosa prepara cada atendimento com cuidado, carinho e atenção aos detalhes.</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px 37px 24px; border-bottom:1px dashed #ead3dc;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="33.33%" style="padding:0 5px 10px;">
                          <div style="border:1px solid #eed6df; border-radius:12px; padding:18px 10px; text-align:center;">
                            <div style="font-size:24px; color:#c64469; line-height:1;">&#10022;</div>
                            <div style="margin-top:10px; font-size:14px; color:#1f171b; font-weight:700;">Beleza</div>
                            <div style="font-size:12px; line-height:1.35; color:#806875;">Cuidado especial</div>
                          </div>
                        </td>
                        <td width="33.33%" style="padding:0 5px 10px;">
                          <div style="border:1px solid #eed6df; border-radius:12px; padding:18px 10px; text-align:center;">
                            <div style="font-size:24px; color:#c64469; line-height:1;">&#9825;</div>
                            <div style="margin-top:10px; font-size:14px; color:#1f171b; font-weight:700;">Atendimento</div>
                            <div style="font-size:12px; line-height:1.35; color:#806875;">Experiência personalizada</div>
                          </div>
                        </td>
                        <td width="33.33%" style="padding:0 5px 10px;">
                          <div style="border:1px solid #eed6df; border-radius:12px; padding:18px 10px; text-align:center;">
                            <div style="font-size:24px; color:#c64469; line-height:1;">&#10048;</div>
                            <div style="margin-top:10px; font-size:14px; color:#1f171b; font-weight:700;">Bem-estar</div>
                            <div style="font-size:12px; line-height:1.35; color:#806875;">Momento para você</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:30px 42px 34px; border-bottom:1px dashed #ead3dc;">
                    <a href="${siteUrl}/login" style="display:inline-block; background:#bd4668; color:#ffffff; text-decoration:none; border-radius:999px; padding:15px 34px; font-size:15px; line-height:1; font-weight:700;">Acessar minha conta &rarr;</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:22px 42px 26px;">
                    <p style="margin:0; font-size:12px; line-height:1.6; color:#7b6870;"><strong style="color:#171214;">Sala Rosa</strong><br>Se você não realizou esse cadastro, ignore este e-mail.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
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
