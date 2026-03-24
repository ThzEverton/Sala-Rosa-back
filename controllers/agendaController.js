import AgendaRepository from "../repositories/agendaRepository.js";

export default class AgendaController {
  #repo;

  constructor() {
    this.#repo = new AgendaRepository();
  }

  // Converte "HH:mm" ou "HH:mm:ss" para minutos — evita bug de comparação lexicográfica
  #toMinutes(timeStr) {
    if (!timeStr) return null;
    const parts = String(timeStr).split(":").map(Number);
    if (parts.length < 2 || parts.some(isNaN)) return null;
    return parts[0] * 60 + parts[1];
  }

  getTipoDia(data) {
    const [ano, mes, dia] = String(data).slice(0, 10).split("-").map(Number);
    const d = new Date(ano, mes - 1, dia);
    const diaSemana = d.getDay();
    return diaSemana === 0 || diaSemana === 6 ? "fim_semana" : "semana";
  }

  async getConfig(req, res) {
    try {
      const config = await this.#repo.obterConfig();
      if (!config) return res.status(404).json({ msg: "Configuração de agenda não encontrada" });

      return res.status(200).json({
        id: config.id,
        horaInicioSemana: config.horaInicioSemana,
        horaFimSemana: config.horaFimSemana,
        horaInicioFimSemana: config.horaInicioFimSemana,
        horaFimFimSemana: config.horaFimFimSemana,
        duracaoSlotMinutos: config.duracaoSlotMinutos,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao buscar configuração da agenda" });
    }
  }

  async putConfig(req, res) {
    try {
      const { horaInicioSemana, horaFimSemana, horaInicioFimSemana, horaFimFimSemana, duracaoSlotMinutos } = req.body;

      if (!horaInicioSemana || !horaFimSemana || !duracaoSlotMinutos) {
        return res.status(400).json({ msg: "horaInicioSemana, horaFimSemana e duracaoSlotMinutos são obrigatórios" });
      }

      const ent = {
        horaInicioSemana,
        horaFimSemana,
        horaInicioFimSemana: horaInicioFimSemana || null,
        horaFimFimSemana: horaFimFimSemana || null,
        duracaoSlotMinutos: Number(duracaoSlotMinutos),
      };

      const ok = await this.#repo.atualizarConfig(ent);
      if (!ok) return res.status(400).json({ msg: "Não foi possível atualizar a configuração" });

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
      const { data, horaInicioExcecao, horaFimExcecao, recorrente, diasSemana } = req.body;

      if (!horaInicioExcecao || !horaFimExcecao) {
        return res.status(400).json({ msg: "horaInicioExcecao e horaFimExcecao são obrigatórios" });
      }

      if (recorrente && (!diasSemana || diasSemana.length === 0)) {
        return res.status(400).json({ msg: "diasSemana é obrigatório para recorrência" });
      }

      const ent = {
        data: data || null,
        horaInicioExcecao,
        horaFimExcecao,
        recorrente: recorrente ? 1 : 0,
        diasSemana: diasSemana ? diasSemana.join(",") : null,
      };

      const ok = await this.#repo.salvarExcecao(ent);
      if (!ok) return res.status(400).json({ msg: "Não foi possível salvar a exceção" });

      return res.status(201).json({ msg: "Exceção salva com sucesso" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao salvar exceção" });
    }
  }

  async obterSlots(req, res) {
    try {
      const data = req.query.date;
      if (!data) return res.status(400).json({ msg: "Data é obrigatória" });

      const config = await this.#repo.obterConfig();
      const bloqueios = await this.#repo.listarBloqueios();
      const todasExcecoes = await this.#repo.listarExcecoes();

      if (!config) return res.status(404).json({ msg: "Configuração de agenda não encontrada" });

      let inicio = null;
      let fim = null;
      const duracao = Number(config.duracaoSlotMinutos);
      const tipoDia = this.getTipoDia(data);

      if (tipoDia === "fim_semana") {
        if (!config.horaInicioFimSemana || !config.horaFimFimSemana) return res.status(200).json([]);
        inicio = String(config.horaInicioFimSemana).slice(0, 8);
        fim = String(config.horaFimFimSemana).slice(0, 8);
      } else {
        if (!config.horaInicioSemana || !config.horaFimSemana) return res.status(200).json([]);
        inicio = String(config.horaInicioSemana).slice(0, 8);
        fim = String(config.horaFimSemana).slice(0, 8);
      }

      if (!inicio || !fim) return res.status(200).json([]);

      // Parse local para evitar offset UTC
      const [ano, mes, dia] = data.split("-").map(Number);
      const diaSemana = new Date(ano, mes - 1, dia).getDay();

      // Exceções aplicáveis ao dia (por data específica ou recorrência por dia da semana)
      const excecoesAplicaveis = todasExcecoes.filter((ex) => {
        if (ex.ativo === false || ex.ativo === 0 || ex.ativo === "0") return false;

        if (Number(ex.recorrente) === 1) {
          const dias = ex.diasSemana ? String(ex.diasSemana).split(",").map(Number) : [];
          return dias.includes(diaSemana);
        }

        return String(ex.data).slice(0, 10) === data;
      });

      const slots = [];
      let atual = new Date(`1970-01-01T${inicio}`);
      const fimDate = new Date(`1970-01-01T${fim}`);

      while (atual < fimDate) {
        const hora = atual.toTimeString().slice(0, 8);
        const horaMin = this.#toMinutes(hora); // ✅ comparação numérica

        // ✅ Slot dentro de exceção → NÃO entra na resposta (some da agenda)
        const dentroDeExcecao = excecoesAplicaveis.some((ex) => {
          const inicioExMin = this.#toMinutes(ex.horaInicioExcecao);
          const fimExMin = this.#toMinutes(ex.horaFimExcecao);

          if (inicioExMin === null || fimExMin === null) return false;

          return horaMin >= inicioExMin && horaMin < fimExMin;
        });

        if (!dentroDeExcecao) {
          // Bloqueio manual do gerente → aparece na agenda como bloqueado
          const bloqueado = bloqueios.some(
            (b) => String(b.data).slice(0, 10) === data && String(b.slot).slice(0, 8) === hora
          );

          slots.push({
            slot: hora,
            bloqueado,
            ocupado: false,
            status: bloqueado ? "bloqueado" : "disponivel",
          });
        }

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
      const { id } = req.params;

      if (!id) return res.status(400).json({ msg: "ID é obrigatório" });

      const ok = await this.#repo.removerExcecaoPorId(id);
      if (!ok) return res.status(400).json({ msg: "Não foi possível remover a exceção" });

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
      if (!data || !slot) return res.status(400).json({ msg: "data e slot são obrigatórios" });

      const bloqueado = await this.#repo.toggleBloqueio(data, slot);
      return res.status(200).json({
        msg: bloqueado ? "Slot bloqueado com sucesso" : "Bloqueio removido com sucesso",
        bloqueado,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao alternar bloqueio" });
    }
  }

  async toggleExcecao(req, res) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ msg: "ID é obrigatório" });

      const ok = await this.#repo.toggleAtivoExcecao(id);
      if (!ok) return res.status(400).json({ msg: "Não foi possível alterar a exceção" });

      return res.status(200).json({ msg: "Status da exceção atualizado" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao atualizar exceção" });
    }
  }
}