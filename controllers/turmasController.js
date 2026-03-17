import TurmasRepository from "../repositories/turmasRepository.js";
import Agendamento from "../entities/Agendamento.js";
import Servico from "../entities/Servico.js";
import Usuario from "../entities/User.js";

export default class TurmasController {
  #repo;

  constructor() {
    this.#repo = new TurmasRepository();
  }

  #isGerente(req) {
    return req.usuarioLogado?.perfil === "gerente";
  }

  // ── LISTAGEM ──────────────────────────────────────────────────────────────

  async listarAbertas(req, res) {
    try {
      const lista = await this.#repo.listarTurmasAbertas();
      return res.status(200).json(lista);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao listar turmas abertas" });
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
      const turma  = await this.#repo.obterTurmaPorId(id);

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

  // ── CRIAR ─────────────────────────────────────────────────────────────────

  async criar(req, res) {
    try {
      if (!this.#isGerente(req)) {
        return res.status(403).json({ msg: "Apenas gerentes podem criar turmas" });
      }

      const { servicoId, data, horaInicio, horaFim, observacao, capacidadeMaxima } = req.body;

      if (!servicoId || !data || !horaInicio || !horaFim) {
        return res.status(400).json({
          msg: "servicoId, data, horaInicio e horaFim são obrigatórios"
        });
      }

      let turma = new Agendamento();
      turma.tipo = "turma";

      turma.servico    = new Servico();
      turma.servico.id = Number(servicoId);

      turma.data             = data;
      turma.horaInicio       = horaInicio;
      turma.horaFim          = horaFim;
      turma.observacao       = observacao ?? null;
      turma.capacidadeMaxima = Number(capacidadeMaxima ?? 5);

      turma.criadoPor    = new Usuario();
      turma.criadoPor.id = req.usuarioLogado.id;

      const { codigoConvite } = await this.#repo.criarTurma(turma);

      return res.status(201).json({
        msg: "Turma criada com sucesso",
        codigoConvite,
        linkConvite: `/turmas/convite/${codigoConvite}`
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: error.message || "Erro ao criar turma" });
    }
  }

  // ── APROVAÇÃO ─────────────────────────────────────────────────────────────

  async aprovar(req, res) {
    try {
      if (!this.#isGerente(req)) {
        return res.status(403).json({ msg: "Apenas gerentes podem aprovar turmas" });
      }

      await this.#repo.aprovarTurma(Number(req.params.id));
      return res.status(200).json({ msg: "Turma aprovada com sucesso" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: error.message || "Erro ao aprovar turma" });
    }
  }

  async recusar(req, res) {
    try {
      if (!this.#isGerente(req)) {
        return res.status(403).json({ msg: "Apenas gerentes podem recusar turmas" });
      }

      const { motivo } = req.body;
      await this.#repo.recusarTurma(Number(req.params.id), motivo ?? null);
      return res.status(200).json({ msg: "Turma recusada" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: error.message || "Erro ao recusar turma" });
    }
  }

  async editarDataHora(req, res) {
    try {
      if (!this.#isGerente(req)) {
        return res.status(403).json({ msg: "Apenas gerentes podem editar turmas" });
      }

      const { data, horaInicio, horaFim, capacidadeMaxima } = req.body;

      await this.#repo.atualizarDataHora(Number(req.params.id), {
        data, horaInicio, horaFim, capacidadeMaxima
      });

      return res.status(200).json({ msg: "Turma atualizada com sucesso" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: error.message || "Erro ao atualizar turma" });
    }
  }

  // ── PARTICIPANTES ─────────────────────────────────────────────────────────

  async entrar(req, res) {
    try {
      if (!req.usuarioLogado?.id) {
        return res.status(401).json({ msg: "Usuário não autenticado" });
      }

      await this.#repo.entrarNaTurma(
        Number(req.params.id),
        Number(req.usuarioLogado.id),
        req.usuarioLogado.nome
      );

      return res.status(200).json({ msg: "Entrada na turma realizada com sucesso" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: error.message || "Erro ao entrar na turma" });
    }
  }
async alterarStatus(req, res) {
  try {
    if (!this.#isGerente(req)) {
      return res.status(403).json({ msg: "Apenas gerentes podem alterar o status da turma" });
    }

    const { id } = req.params;
    const { status, motivo } = req.body;

    if (!status) {
      return res.status(400).json({ msg: "status é obrigatório" });
    }

    if (status === 'aprovado') {
      await this.#repo.aprovarTurma(Number(id));
      return res.status(200).json({ msg: "Turma aprovada com sucesso" });
    }

    if (status === 'recusado') {
      await this.#repo.recusarTurma(Number(id), motivo ?? null);
      return res.status(200).json({ msg: "Turma recusada" });
    }

    return res.status(400).json({ msg: `Status '${status}' não reconhecido` });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: error.message || "Erro ao alterar status da turma" });
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
        turmaId: resultado.turmaId
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: error.message || "Erro ao entrar na turma" });
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
        Number(req.params.userId)
      );

      return res.status(200).json({ msg: "Participante removido com sucesso" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: error.message || "Erro ao remover participante" });
    }
  }
}