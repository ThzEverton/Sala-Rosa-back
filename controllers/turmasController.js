import TurmasRepository from "../repositories/turmasRepository.js";
import UsersRepository from "../repositories/usersRepository.js";
import Agendamento from "../entities/Agendamento.js";
import Servico from "../entities/Servico.js";
import Usuario from "../entities/User.js";

export default class TurmasController {
  #repo;
  #usersRepo;

  constructor() {
    this.#repo = new TurmasRepository();
    this.#usersRepo = new UsersRepository();
  }

  #isGerente(req) {
    return req.usuarioLogado?.perfil === "gerente";
  }

  #somarHoras(hora, horas) {
    const base = new Date(`1970-01-01T${String(hora).slice(0, 8)}`);
    base.setHours(base.getHours() + Number(horas));
    return base.toTimeString().slice(0, 8);
  }

  async listarAbertas(req, res) {
  try {
    const userId = Number(req.usuarioLogado?.id);

    if (!userId) {
      return res.status(401).json({ msg: "Usuário não autenticado" });
    }

    const lista = await this.#repo.listarTurmasDoUsuario(userId);
    return res.status(200).json(lista);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Erro ao listar turmas" });
  }
}

  async listarTodas(req, res) {
    try {
      const lista = await this.#repo.listarTodasTurmas();
      return res.status(200).json(lista);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao listar turmas" });
    }
  }

  async obterPorId(req, res) {
    try {
      const { id } = req.params;
      const turma = await this.#repo.obterTurmaPorId(id);

      if (!turma) {
        return res.status(404).json({ msg: "Turma não encontrada" });
      }

      const participantes = await this.#repo.listarParticipantes(id);
      return res.status(200).json({ turma, participantes });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao buscar turma" });
    }
  }

  async obterPorCodigo(req, res) {
    try {
      const { codigo } = req.params;
      const turma = await this.#repo.obterTurmaPorCodigo(codigo.toUpperCase());

      if (!turma) {
        return res.status(404).json({ msg: "Código de convite inválido" });
      }

      return res.status(200).json({ turma });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao buscar turma pelo código" });
    }
  }

  async criar(req, res) {
    try {
      if (!req.usuarioLogado?.id) {
        return res.status(401).json({ msg: "Usuário não autenticado" });
      }

      const { servicoId, data, horaInicio, observacao, capacidadeMaxima } = req.body;

      if (!servicoId || !data || !horaInicio) {
        return res.status(400).json({
          msg: "servicoId, data e horaInicio são obrigatórios",
        });
      }

      const servicoIdNumero = Number(servicoId);
      const capacidadeNumero = Number(capacidadeMaxima ?? 5);

      if (!Number.isInteger(servicoIdNumero) || servicoIdNumero <= 0) {
        return res.status(400).json({ msg: "servicoId inválido" });
      }

      if (!Number.isInteger(capacidadeNumero) || capacidadeNumero < 2 || capacidadeNumero > 5) {
        return res.status(400).json({
          msg: "capacidadeMaxima deve ser entre 2 e 5",
        });
      }

      const dataNormalizada = String(data).slice(0, 10);
      const horaInicioNormalizada = String(horaInicio).slice(0, 8);

      let turma = new Agendamento();
      turma.tipo = "turma";

      turma.servico = new Servico();
      turma.servico.id = servicoIdNumero;

      turma.data = dataNormalizada;
      turma.horaInicio = horaInicioNormalizada;
      turma.horaFim = this.#somarHoras(turma.horaInicio, 2);
      turma.observacao = observacao ?? null;
      turma.capacidadeMaxima = capacidadeNumero;

      turma.criadoPor = new Usuario();
      turma.criadoPor.id = Number(req.usuarioLogado.id);

      const { codigoConvite } = await this.#repo.criarTurma(turma);

      return res.status(201).json({
        msg: "Solicitação de turma criada com sucesso",
        codigoConvite,
        linkConvite: `/turmas/convite/${codigoConvite}`,
      });
    } catch (error) {
      console.error("ERRO AO CRIAR TURMA:", error);
      const mensagem = error.message || "Erro ao criar turma";

      if (mensagem.includes("não encontrada") || mensagem.includes("não encontrado")) {
        return res.status(404).json({ msg: mensagem });
      }

      if (
        mensagem.includes("obrigatório") ||
        mensagem.includes("Horário") ||
        mensagem.includes("bloqueio") ||
        mensagem.includes("indisponível") ||
        mensagem.includes("agendamento nesse horário") ||
        mensagem.includes("Agenda") ||
        mensagem.includes("inválido")
      ) {
        return res.status(400).json({ msg: mensagem });
      }

      return res.status(500).json({ msg: mensagem });
    }
  }

  // ── PATCH /:id/aprovar ──────────────────────────────────────────────────────
  async aprovar(req, res) {
    try {
      if (!this.#isGerente(req)) {
        return res.status(403).json({ msg: "Apenas gerentes podem aprovar turmas" });
      }

      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ msg: "ID da turma inválido" });
      }

      await this.#repo.aprovarTurma(id);
      return res.status(200).json({ msg: "Turma aprovada com sucesso" });
    } catch (error) {
      console.error("ERRO AO APROVAR TURMA:", error);
      const mensagem = error.message || "Erro ao aprovar turma";

      if (mensagem.includes("não encontrada")) {
        return res.status(404).json({ msg: mensagem });
      }

      if (
        mensagem.includes("não pode ser aprovada") ||
        mensagem.includes("bloqueio") ||
        mensagem.includes("ocupado") ||
        mensagem.includes("indisponível")
      ) {
        return res.status(400).json({ msg: mensagem });
      }

      return res.status(500).json({ msg: mensagem });
    }
  }

  // ── PATCH /:id/recusar ──────────────────────────────────────────────────────
  async recusar(req, res) {
    try {
      if (!this.#isGerente(req)) {
        return res.status(403).json({ msg: "Apenas gerentes podem recusar turmas" });
      }

      const id = Number(req.params.id);
      const { motivo } = req.body || {};

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ msg: "ID da turma inválido" });
      }

      await this.#repo.recusarTurma(id, motivo ?? null);
      return res.status(200).json({ msg: "Turma recusada" });
    } catch (error) {
      console.error("ERRO AO RECUSAR TURMA:", error);
      const mensagem = error.message || "Erro ao recusar turma";

      if (mensagem.includes("não encontrada")) {
        return res.status(404).json({ msg: mensagem });
      }

      if (mensagem.includes("não pode ser recusada")) {
        return res.status(400).json({ msg: mensagem });
      }

      return res.status(500).json({ msg: mensagem });
    }
  }

  // ── PATCH /:id/status  (único — sem duplicação) ─────────────────────────────
  async alterarStatus(req, res) {
    try {
      if (!this.#isGerente(req)) {
        return res.status(403).json({ msg: "Apenas gerentes podem alterar o status da turma" });
      }

      const id = Number(req.params.id);
      const { status, motivo } = req.body || {};

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ msg: "ID da turma inválido" });
      }

      if (!status) {
        return res.status(400).json({ msg: "status é obrigatório" });
      }

      if (status === "aprovado") {
        await this.#repo.aprovarTurma(id);
        return res.status(200).json({ msg: "Turma aprovada com sucesso" });
      }

      if (status === "recusado") {
        await this.#repo.recusarTurma(id, motivo ?? null);
        return res.status(200).json({ msg: "Turma recusada" });
      }

      return res.status(400).json({ msg: `Status '${status}' não reconhecido` });
    } catch (error) {
      console.error("ERRO AO ALTERAR STATUS DA TURMA:", error);
      const mensagem = error.message || "Erro ao alterar status da turma";

      if (mensagem.includes("não encontrada")) {
        return res.status(404).json({ msg: mensagem });
      }

      if (
        mensagem.includes("não pode ser aprovada") ||
        mensagem.includes("não pode ser recusada") ||
        mensagem.includes("bloqueio") ||
        mensagem.includes("ocupado") ||
        mensagem.includes("indisponível")
      ) {
        return res.status(400).json({ msg: mensagem });
      }

      return res.status(500).json({ msg: mensagem });
    }
  }

  async editarDataHora(req, res) {
    try {
      if (!this.#isGerente(req)) {
        return res.status(403).json({ msg: "Apenas gerentes podem editar turmas" });
      }

      const { data, horaInicio, horaFim, capacidadeMaxima } = req.body;

      await this.#repo.atualizarDataHora(Number(req.params.id), {
        data,
        horaInicio,
        horaFim,
        capacidadeMaxima,
      });

      return res.status(200).json({ msg: "Turma atualizada com sucesso" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: error.message || "Erro ao atualizar turma" });
    }
  }

  async entrar(req, res) {
    try {
      if (!req.usuarioLogado?.id) {
        return res.status(401).json({ msg: "Usuário não autenticado" });
      }

      const turmaId = Number(req.params.id);
      const isGerente = this.#isGerente(req);
      const usuarioId = isGerente && req.body?.userId
        ? Number(req.body.userId)
        : Number(req.usuarioLogado.id);

      if (!Number.isInteger(turmaId) || turmaId <= 0) {
        return res.status(400).json({ msg: "ID da turma inválido" });
      }

      if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
        return res.status(400).json({ msg: "Usuário inválido" });
      }

      const usuarioParticipante = isGerente && req.body?.userId
        ? await this.#usersRepo.obterPorId(usuarioId)
        : req.usuarioLogado;

      if (!usuarioParticipante) {
        return res.status(404).json({ msg: "UsuÃ¡rio participante nÃ£o encontrado" });
      }

      if (
        isGerente &&
        req.body?.userId &&
        usuarioParticipante.perfil &&
        usuarioParticipante.perfil !== "cliente"
      ) {
        return res.status(400).json({ msg: "Apenas clientes podem ser adicionados como participantes" });
      }

      await this.#repo.entrarNaTurma(turmaId, usuarioId, usuarioParticipante.nome, {
        permitirPendente: isGerente && Boolean(req.body?.userId),
      });
      return res.status(200).json({ msg: "Entrada na turma realizada com sucesso" });
    } catch (error) {
      console.error("Erro em entrar:", error);

      const mensagem = error.message || "Erro ao entrar na turma";

      if (mensagem.includes("não encontrada")) {
        return res.status(404).json({ msg: mensagem });
      }

      if (
        mensagem.includes("já está") ||
        mensagem.includes("lotada") ||
        mensagem.includes("cheia") ||
        mensagem.includes("não está disponível")
      ) {
        return res.status(409).json({ msg: mensagem });
      }

      return res.status(500).json({ msg: mensagem });
    }
  }

  async entrarPorCodigo(req, res) {
    try {
      if (!req.usuarioLogado?.id) {
        return res.status(401).json({ msg: "Usuário não autenticado" });
      }

      const resultado = await this.#repo.entrarNaTurmaPorCodigo(
        req.params.codigo.toUpperCase(),
        Number(req.usuarioLogado.id),
        req.usuarioLogado.nome
      );

      return res.status(200).json({
        msg: "Entrada na turma realizada com sucesso",
        turmaId: resultado.turmaId,
      });
    } catch (error) {
      console.error(error);
      const mensagem = error.message || "Erro ao entrar na turma";

      if (mensagem.includes("inválido") || mensagem.includes("não encontrada")) {
        return res.status(404).json({ msg: mensagem });
      }

      if (
        mensagem.includes("já está") ||
        mensagem.includes("lotada") ||
        mensagem.includes("cheia") ||
        mensagem.includes("não está disponível")
      ) {
        return res.status(409).json({ msg: mensagem });
      }

      return res.status(500).json({ msg: mensagem });
    }
  }

  async sair(req, res) {
    try {
      if (!req.usuarioLogado?.id) {
        return res.status(401).json({ msg: "Usuário não autenticado" });
      }

      await this.#repo.sairDaTurma(
        Number(req.params.id),
        Number(req.usuarioLogado.id)
      );

      return res.status(200).json({ msg: "Saída da turma realizada com sucesso" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: error.message || "Erro ao sair da turma" });
    }
  }

  async removerParticipante(req, res) {
    try {
      if (!this.#isGerente(req)) {
        return res.status(403).json({ msg: "Apenas gerentes podem remover participantes" });
      }

      await this.#repo.removerParticipante(
        Number(req.params.id),
        Number(req.params.userId),
        {
          converterParaIndividual:
            req.query?.converterParaIndividual === "1" ||
            req.query?.converterParaIndividual === "true",
        }
      );

      return res.status(200).json({ msg: "Participante removido com sucesso" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: error.message || "Erro ao remover participante" });
    }
  }
}
