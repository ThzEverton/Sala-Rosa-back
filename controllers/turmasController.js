import TurmasRepository from "../repositories/turmasRepository.js";
import Agendamento from "../entities/Agendamento.js";
import Servico from "../entities/Servico.js";
import Usuario from "../entities/User.js";

export default class TurmasController {
  #repo;

  constructor() {
    this.#repo = new TurmasRepository();
  }

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

      const turma = await this.#repo.obterTurmaPorId(id);

      if (!turma) {
        return res.status(404).json({ msg: "Turma não encontrada" });
      }

      const participantes = await this.#repo.listarParticipantes(id);

      return res.status(200).json({
        turma,
        participantes
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao buscar turma" });
    }
  }

  async criar(req, res) {
    try {
      const {
        servicoId,
        data,
        horaInicio,
        horaFim,
        observacao
      } = req.body;

      if (!servicoId || !data || !horaInicio || !horaFim) {
        return res.status(400).json({
          msg: "servicoId, data, horaInicio e horaFim são obrigatórios"
        });
      }

      let turma = new Agendamento();
      turma.tipo = "turma";

      turma.servico = new Servico();
      turma.servico.id = Number(servicoId);

      turma.data = data;
      turma.horaInicio = horaInicio;
      turma.horaFim = horaFim;
      turma.status = "confirmado";
      turma.observacao = observacao || null;

      turma.criadoPor = new Usuario();
      turma.criadoPor.id = req.user?.id || null;

      const ok = await this.#repo.criarTurma(turma);

      if (!ok) {
        return res.status(400).json({ msg: "Não foi possível criar a turma" });
      }

      return res.status(201).json({ msg: "Turma criada com sucesso" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: error.message || "Erro ao criar turma" });
    }
  }

  async entrar(req, res) {
    try {
      const { id } = req.params;

      if (!req.user?.id) {
        return res.status(401).json({ msg: "Usuário não autenticado" });
      }

      await this.#repo.entrarNaTurma(
        Number(id),
        Number(req.user.id),
        req.user.nome
      );

      return res.status(200).json({ msg: "Entrada na turma realizada com sucesso" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: error.message || "Erro ao entrar na turma" });
    }
  }

  async sair(req, res) {
    try {
      const { id } = req.params;

      if (!req.user?.id) {
        return res.status(401).json({ msg: "Usuário não autenticado" });
      }

      await this.#repo.sairDaTurma(
        Number(id),
        Number(req.user.id)
      );

      return res.status(200).json({ msg: "Saída da turma realizada com sucesso" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: error.message || "Erro ao sair da turma" });
    }
  }

  async removerParticipante(req, res) {
    try {
      const { id, userId } = req.params;

      await this.#repo.removerParticipante(
        Number(id),
        Number(userId)
      );

      return res.status(200).json({ msg: "Participante removido com sucesso" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: error.message || "Erro ao remover participante" });
    }
  }
}