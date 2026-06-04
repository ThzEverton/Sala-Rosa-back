import EmailCampanhasRepository from "../repositories/emailCampanhasRepository.js";
import { enviarEmail } from "../services/emailService.js";

export default class EmailCampanhasController {
  #repo;

  constructor() {
    this.#repo = new EmailCampanhasRepository();
  }

  #escaparHtml(valor) {
    return String(valor || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  #validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }

  #normalizarTexto(valor) {
    return String(valor || "").trim();
  }

  #montarHtmlCampanha(campanha, cliente, imagemCid = null) {
    const nome = this.#escaparHtml(cliente?.nome || "cliente");
    const assunto = this.#escaparHtml(campanha.assunto);
    const mensagem = this.#escaparHtml(
      String(campanha.mensagem || "").replace(/\{\{\s*nome\s*\}\}/gi, cliente?.nome || "")
    ).replace(/\r?\n/g, "<br>");
    const imagemUrl = imagemCid ? `cid:${imagemCid}` : campanha.imagemUrl;
    const imagemHtml = imagemUrl
      ? `
        <tr>
          <td style="padding: 0 0 22px;">
            <img src="${this.#escaparHtml(imagemUrl)}" alt="" style="display: block; width: 100%; max-width: 560px; border-radius: 10px;">
          </td>
        </tr>
      `
      : "";

    return `
      <div style="margin:0; padding:0; background:#f6f3f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f3f5; padding:24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden; font-family:Arial,sans-serif; color:#2b2b2b;">
                <tr>
                  <td style="padding:28px 28px 12px;">
                    <div style="font-size:13px; color:#b25b7f; font-weight:bold; letter-spacing:.2px;">Sala Rosa</div>
                    <h1 style="margin:8px 0 0; font-size:24px; line-height:1.25; color:#2b2b2b;">${assunto}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px;">
                    <p style="margin:0 0 18px; font-size:16px; line-height:1.5;">Olá, ${nome}.</p>
                  </td>
                </tr>
                ${imagemHtml}
                <tr>
                  <td style="padding:0 28px 28px;">
                    <div style="font-size:16px; line-height:1.6;">${mensagem}</div>
                    <p style="margin:24px 0 0; font-size:12px; color:#777;">Sala Rosa</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;
  }

  #montarAnexosInline(body) {
    if (!body.imagemBase64) return { attachments: [], cid: null };

    const cid = `campanha-${Date.now()}@salarosa`;
    const base64Limpo = String(body.imagemBase64).replace(/^data:[^;]+;base64,/, "");

    return {
      cid,
      attachments: [
        {
          filename: body.imagemNome || "campanha.png",
          content: base64Limpo,
          encoding: "base64",
          cid,
          contentType: body.imagemTipo || undefined,
        },
      ],
    };
  }

  #validarCampanhaPayload(body) {
    const titulo = this.#normalizarTexto(body.titulo || body.assunto);
    const assunto = this.#normalizarTexto(body.assunto);
    const mensagem = this.#normalizarTexto(body.mensagem || body.texto);
    const imagemUrl = this.#normalizarTexto(body.imagemUrl || body.imagem_url) || null;

    if (!titulo || titulo.length < 2) {
      return { erro: "Título inválido." };
    }
    if (!assunto || assunto.length < 2) {
      return { erro: "Assunto inválido." };
    }
    if (!mensagem || mensagem.length < 2) {
      return { erro: "Mensagem inválida." };
    }

    return { titulo, assunto, mensagem, imagemUrl };
  }

  async listar(req, res) {
    try {
      const campanhas = await this.#repo.listarCampanhas();
      return res.status(200).json({ campanhas });
    } catch (err) {
      console.error("Erro ao listar campanhas de email:", err);
      return res.status(500).json({ msg: "Erro ao listar campanhas de email." });
    }
  }

  async listarClientes(req, res) {
    try {
      const clientes = await this.#repo.listarClientesComEmail({ todosClientes: true });
      return res.status(200).json({ clientes });
    } catch (err) {
      console.error("Erro ao listar clientes para email:", err);
      return res.status(500).json({ msg: "Erro ao listar clientes para email." });
    }
  }

  async criar(req, res) {
    try {
      const payload = this.#validarCampanhaPayload(req.body);
      if (payload.erro) return res.status(400).json({ msg: payload.erro });

      const id = await this.#repo.criarCampanha({
        ...payload,
        criadoPorUserId: req.usuarioLogado?.id || null,
      });

      return res.status(201).json({ msg: "Campanha salva com sucesso.", id });
    } catch (err) {
      console.error("Erro ao criar campanha de email:", err);
      return res.status(500).json({ msg: "Erro ao criar campanha de email." });
    }
  }

  async enviarAvulso(req, res) {
    try {
      const payload = this.#validarCampanhaPayload(req.body);
      if (payload.erro) return res.status(400).json({ msg: payload.erro });

      const id = await this.#repo.criarCampanha({
        ...payload,
        criadoPorUserId: req.usuarioLogado?.id || null,
      });

      req.params.id = id;
      return await this.enviar(req, res);
    } catch (err) {
      console.error("Erro ao enviar campanha avulsa:", err);
      return res.status(500).json({ msg: "Erro ao enviar campanha avulsa." });
    }
  }

  async enviar(req, res) {
    try {
      const campanha = await this.#repo.obterCampanha(req.params.id);
      if (!campanha) return res.status(404).json({ msg: "Campanha não encontrada." });

      const todosClientes = Boolean(req.body.todosClientes || req.body.todos_clientes);
      const clienteIds = Array.isArray(req.body.clienteIds)
        ? req.body.clienteIds
        : Array.isArray(req.body.clientes)
          ? req.body.clientes
          : [];

      const destinatarios = await this.#repo.listarClientesComEmail({ clienteIds, todosClientes });
      if (!destinatarios.length) {
        return res.status(400).json({ msg: "Nenhum cliente com email válido foi selecionado." });
      }

      const inline = this.#montarAnexosInline(req.body);
      const resultados = [];

      for (const cliente of destinatarios) {
        if (!this.#validarEmail(cliente.email)) {
          resultados.push({
            userId: cliente.id,
            nome: cliente.nome,
            email: cliente.email,
            status: "erro",
            erro: "Email inválido",
          });
          continue;
        }

        try {
          const html = this.#montarHtmlCampanha(campanha, cliente, inline.cid);
          await enviarEmail(cliente.email, campanha.assunto, html, {
            attachments: inline.attachments,
          });

          resultados.push({
            userId: cliente.id,
            nome: cliente.nome,
            email: cliente.email,
            status: "enviado",
          });
        } catch (err) {
          resultados.push({
            userId: cliente.id,
            nome: cliente.nome,
            email: cliente.email,
            status: "erro",
            erro: err.message,
          });
        }
      }

      await this.#repo.registrarResultadoEnvio(campanha.id, resultados);

      const enviados = resultados.filter((r) => r.status === "enviado").length;
      const erros = resultados.filter((r) => r.status === "erro").length;

      return res.status(200).json({
        msg: "Campanha processada.",
        campanhaId: campanha.id,
        total: resultados.length,
        enviados,
        erros,
        resultados,
      });
    } catch (err) {
      console.error("Erro ao enviar campanha de email:", err);
      return res.status(500).json({ msg: "Erro ao enviar campanha de email." });
    }
  }
}
