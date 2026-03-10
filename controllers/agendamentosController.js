import AgendamentosRepository from "../repositories/agendamentosRepository.js";

export default class AgendamentosController {
  #repo;

  constructor() {
    this.#repo = new AgendamentosRepository();
  }

  async listar(req, res) {
    try {
      const { data } = req.query;
      const lista = await this.#repo.listar(data || null);
      return res.status(200).json(lista);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao listar agendamentos" });
    }
  }

  async obterPorId(req, res) {
    try {
      const { id } = req.params;

      const agendamento = await this.#repo.obterPorId(id);
      if (!agendamento) {
        return res.status(404).json({ msg: "Agendamento não encontrado" });
      }

      const participantes = await this.#repo.listarParticipantes(id);

      return res.status(200).json({
        agendamento,
        participantes
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao buscar agendamento" });
    }
  }

  async criar(req, res) {
  try {
    const { servicoId, data, horaInicio, observacao } = req.body;

    if (!servicoId || !data || !horaInicio) {
      return res.status(400).json({
        msg: "servicoId, data e horaInicio são obrigatórios"
      });
    }

    if (!req.usuarioLogado?.id) {
      return res.status(401).json({ msg: "Usuário não autenticado" });
    }

    const id = await this.#repo.criar({
      servicoId: Number(servicoId),
      data,
      horaInicio: String(horaInicio).slice(0, 8),
      observacao: observacao || null,
      userId: Number(req.usuarioLogado.id),
      nomeUser: req.usuarioLogado.nome
    });

    return res.status(201).json({
      msg: "Agendamento criado com sucesso",
      id
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: error.message || "Erro ao criar agendamento"
    });
  }
}

  async cancelar(req, res) {
    try {
      const { id } = req.params;

      await this.#repo.cancelar(Number(id));

      return res.status(200).json({
        msg: "Agendamento cancelado com sucesso"
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        msg: error.message || "Erro ao cancelar agendamento"
      });
    }
  }
}