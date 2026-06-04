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

  #formatarMensagemHtml(mensagem) {
    const linhas = String(mensagem || "")
      .split(/\r?\n/)
      .map((linha) => this.#escaparHtml(linha.trim()))
      .filter(Boolean);

    if (!linhas.length) return "";

    return linhas
      .map((linha) => `<p style="margin:0 0 14px; font-size:16px; line-height:1.75; color:#2f2a2d;">${linha}</p>`)
      .join("");
  }

  #montarBlocoServicos() {
    return `
      <tr>
        <td style="padding:28px 37px 24px; border-bottom:1px dashed #ead3dc;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td width="33.33%" style="padding:0 5px 10px;">
                <div style="border:1px solid #eed6df; border-radius:12px; padding:18px 10px; text-align:center;">
                  <div style="font-size:24px; color:#c64469; line-height:1;">&#10022;</div>
                  <div style="margin-top:10px; font-size:14px; line-height:1.25; color:#1f171b; font-weight:700;">Beleza</div>
                  <div style="font-size:12px; line-height:1.35; color:#806875;">Cuidado especial</div>
                </div>
              </td>
              <td width="33.33%" style="padding:0 5px 10px;">
                <div style="border:1px solid #eed6df; border-radius:12px; padding:18px 10px; text-align:center;">
                  <div style="font-size:24px; color:#c64469; line-height:1;">&#9825;</div>
                  <div style="margin-top:10px; font-size:14px; line-height:1.25; color:#1f171b; font-weight:700;">Atendimento</div>
                  <div style="font-size:12px; line-height:1.35; color:#806875;">Experiência personalizada</div>
                </div>
              </td>
              <td width="33.33%" style="padding:0 5px 10px;">
                <div style="border:1px solid #eed6df; border-radius:12px; padding:18px 10px; text-align:center;">
                  <div style="font-size:24px; color:#c64469; line-height:1;">&#10048;</div>
                  <div style="margin-top:10px; font-size:14px; line-height:1.25; color:#1f171b; font-weight:700;">Bem-estar</div>
                  <div style="font-size:12px; line-height:1.35; color:#806875;">Momento para você</div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }

  #montarHtmlCampanha(campanha, cliente, imagemCid = null) {
    const nome = this.#escaparHtml(cliente?.nome || "cliente");
    const assunto = this.#escaparHtml(campanha.assunto);
    const mensagem = this.#formatarMensagemHtml(
      String(campanha.mensagem || "").replace(/\{\{\s*nome\s*\}\}/gi, cliente?.nome || "")
    );
    const imagemUrl = imagemCid ? `cid:${imagemCid}` : campanha.imagemUrl;
    const frontendUrl = this.#escaparHtml(
      (process.env.FRONTEND_URL || process.env.APP_URL || "https://melissamartelli.com.br").replace(/\/$/, "")
    );
    const servicosHtml = campanha.incluirServicos ? this.#montarBlocoServicos() : "";
    const imagemHtml = imagemUrl
      ? `
        <tr>
          <td style="padding:0 34px 26px;">
            <img src="${this.#escaparHtml(imagemUrl)}" alt="" style="display:block; width:100%; max-width:692px; border-radius:16px; border:1px solid #f1d7df;">
          </td>
        </tr>
      `
      : "";

    return `
      <div style="margin:0; padding:0; background:#f8f4f6;">
        <span style="display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden;">
          Uma mensagem especial da Sala Rosa para você.
        </span>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f4f6; padding:18px 8px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:760px; background:#ffffff; border-radius:18px; overflow:hidden; font-family:Arial,Helvetica,sans-serif; color:#2b2b2b; border:1px solid #efd5de; box-shadow:0 14px 36px rgba(94,45,64,.10);">
                <tr>
                  <td align="center" style="background:#bd4668; background:linear-gradient(180deg,#cf5d7c 0%,#b83f62 100%); padding:30px 34px 26px;">
                    <div style="font-size:26px; line-height:1.2; color:#ffffff; font-weight:700; letter-spacing:.2px;">Sala Rosa</div>
                    <div style="margin-top:6px; font-size:11px; line-height:1.4; color:#ffe9ef; font-weight:700; letter-spacing:.7px; text-transform:uppercase;">Espaço de beleza e bem-estar</div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:30px 36px 24px; border-bottom:1px solid #f0dbe2;">
                    <p style="margin:0 0 8px; font-size:12px; line-height:1.5; color:#8a6473; font-weight:700;">Uma mensagem especial para você</p>
                    <h1 style="margin:0; font-size:28px; line-height:1.22; color:#171214;">${assunto}</h1>
                    <p style="margin:13px 0 0; font-size:16px; line-height:1.6; color:#6b5860;">Olá, <strong style="color:#171214;">${nome}</strong>.</p>
                  </td>
                </tr>
                ${imagemHtml}
                <tr>
                  <td style="padding:30px 42px 12px; border-bottom:1px dashed #ead3dc;">
                    ${mensagem}
                  </td>
                </tr>
                <tr>
                  <td style="padding:26px 42px 24px; border-bottom:1px dashed #ead3dc;">
                    <div style="background:#fff1f5; border-left:5px solid #cf4d72; border-radius:12px; padding:18px 20px;">
                      <p style="margin:0 0 4px; font-size:13px; line-height:1.4; color:#9f3154; font-weight:700;">Oferta / destaque</p>
                      <p style="margin:0; font-size:15px; line-height:1.65; color:#6f2f47; font-weight:700;">Conteúdo preparado com carinho para deixar seu cuidado ainda mais especial.</p>
                    </div>
                  </td>
                </tr>
                ${servicosHtml}
                <tr>
                  <td align="center" style="padding:30px 42px 34px; border-bottom:1px dashed #ead3dc;">
                    <a href="${frontendUrl}/login" style="display:inline-block; background:#bd4668; color:#ffffff; text-decoration:none; border-radius:999px; padding:15px 34px; font-size:15px; line-height:1; font-weight:700;">Agendar meu horário &rarr;</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:22px 42px 26px;">
                    <p style="margin:0; font-size:12px; line-height:1.6; color:#7b6870;"><strong style="color:#171214;">Sala Rosa</strong><br>Espaço de beleza e bem-estar</p>
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
    const incluirServicos = Boolean(body.incluirServicos || body.incluir_servicos);

    if (!titulo || titulo.length < 2) {
      return { erro: "Título inválido." };
    }
    if (!assunto || assunto.length < 2) {
      return { erro: "Assunto inválido." };
    }
    if (!mensagem || mensagem.length < 2) {
      return { erro: "Mensagem inválida." };
    }

    return { titulo, assunto, mensagem, imagemUrl, incluirServicos };
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
