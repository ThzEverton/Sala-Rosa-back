import AgendaRepository from "../repositories/agendaRepository.js";

export default class AgendaController {
  #repo;

  constructor() {
    this.#repo = new AgendaRepository();
  }


  async getConfig(req, res) {
    try {
      const config = await this.#repo.obterConfig();

      if (!config) {
        return res.status(404).json({ msg: "Configuração de agenda não encontrada" });
      }

      return res.status(200).json(config);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao buscar configuração da agenda" });
    }
  }

  async putConfig(req, res) {
    try {
      const { horaInicioPadrao, horaFimPadrao, duracaoSlotMinutos } = req.body;

      if (!horaInicioPadrao || !horaFimPadrao || !duracaoSlotMinutos) {
        return res.status(400).json({ msg: "horaInicioPadrao, horaFimPadrao e duracaoSlotMinutos são obrigatórios" });
      }

      const ent = {
        horaInicioPadrao,
        horaFimPadrao,
        duracaoSlotMinutos
      };

      const ok = await this.#repo.atualizarConfig(ent);

      if (!ok) {
        return res.status(400).json({ msg: "Não foi possível atualizar a configuração" });
      }

      return res.status(200).json({ msg: "Configuração atualizada com sucesso" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao atualizar configuração da agenda" });
    }
  }

  async getExcecoes(req, res) {
    try {
      const lista = await this.#repo.listarExcecoes();
      return res.status(200).json(lista);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao listar exceções" });
    }
  }

  async postExcecao(req, res) {
    try {
      const { data, horaInicioExcecao, horaFimExcecao } = req.body;

      if (!data || !horaInicioExcecao || !horaFimExcecao) {
        return res.status(400).json({ msg: "data, horaInicioExcecao e horaFimExcecao são obrigatórios" });
      }

      const ent = {
        data,
        horaInicioExcecao,
        horaFimExcecao
      };

      const ok = await this.#repo.salvarExcecao(ent);

      if (!ok) {
        return res.status(400).json({ msg: "Não foi possível salvar a exceção" });
      }

      return res.status(201).json({ msg: "Exceção salva com sucesso" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao salvar exceção" });
    }
  }
  async obterSlots(req, res) {
  try {
    const data = req.query.date;

    if (!data) {
      return res.status(400).json({ msg: "Data é obrigatória" });
    }

    const config = await this.#repo.obterConfig();
    const bloqueios = await this.#repo.listarBloqueios();

    if (!config) {
      return res.status(404).json({ msg: "Configuração de agenda não encontrada" });
    }

    const inicio = String(config.horaInicioPadrao).slice(0, 8);
    const fim = String(config.horaFimPadrao).slice(0, 8);
    const duracao = Number(config.duracaoSlotMinutos);

    const slots = [];

    let atual = new Date(`1970-01-01T${inicio}`);
    const fimDate = new Date(`1970-01-01T${fim}`);

    while (atual < fimDate) {
      const hora = atual.toTimeString().slice(0, 8);

      const bloqueado = bloqueios.some(b =>
        String(b.data).slice(0, 10) === data &&
        String(b.slot).slice(0, 8) === hora
      );

      slots.push({
        slot: hora,
        bloqueado,
        ocupado: false,
        status: bloqueado ? "bloqueado" : "disponivel"
      });

      atual.setMinutes(atual.getMinutes() + duracao);
    }

    return res.status(200).json(slots);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: err.message });
  }
}
  async deleteExcecao(req, res) {
    try {
      const { data } = req.params;

      if (!data) {
        return res.status(400).json({ msg: "Data é obrigatória" });
      }

      const ok = await this.#repo.removerExcecao(data);

      if (!ok) {
        return res.status(400).json({ msg: "Não foi possível remover a exceção" });
      }

      return res.status(200).json({ msg: "Exceção removida com sucesso" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao remover exceção" });
    }
  }

  async getBloqueios(req, res) {
    try {
      const lista = await this.#repo.listarBloqueios();
      return res.status(200).json(lista);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao listar bloqueios" });
    }
  }

  async postToggleBloqueio(req, res) {
    try {
      const { data, slot } = req.body;

      if (!data || !slot) {
        return res.status(400).json({ msg: "data e slot são obrigatórios" });
      }

      const bloqueado = await this.#repo.toggleBloqueio(data, slot);

      return res.status(200).json({
        msg: bloqueado ? "Slot bloqueado com sucesso" : "Bloqueio removido com sucesso",
        bloqueado
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao alternar bloqueio" });
    }
  }
}