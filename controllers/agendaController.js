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

    if (!data) {
      return res.status(400).json({ msg: "Data é obrigatória" });
    }

    const normalizarData = (valor) => {
      if (!valor) return "";

      if (valor instanceof Date) {
        const ano = valor.getUTCFullYear();
        const mes = String(valor.getUTCMonth() + 1).padStart(2, "0");
        const dia = String(valor.getUTCDate()).padStart(2, "0");
        return `${ano}-${mes}-${dia}`;
      }

      const str = String(valor);

      if (str.includes("T")) {
        return str.slice(0, 10);
      }

      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
      }

      const dt = new Date(str);
      if (!Number.isNaN(dt.getTime())) {
        const ano = dt.getUTCFullYear();
        const mes = String(dt.getUTCMonth() + 1).padStart(2, "0");
        const dia = String(dt.getUTCDate()).padStart(2, "0");
        return `${ano}-${mes}-${dia}`;
      }

      return str.slice(0, 10);
    };

    const normalizarHora = (valor) => {
      if (!valor) return "";

      if (valor instanceof Date) {
        return valor.toISOString().slice(11, 19);
      }

      const str = String(valor);

      if (str.includes("T")) {
        return str.slice(11, 19);
      }

      if (str.includes(" ")) {
        const parteHora = str.split(" ")[1];
        if (parteHora) return parteHora.slice(0, 8);
      }

      return str.slice(0, 8);
    };

    const dataFormatada = normalizarData(data);

    const config = await this.#repo.obterConfig();
    const bloqueios = await this.#repo.listarBloqueios();
    const todasExcecoes = await this.#repo.listarExcecoes();
    const slotsOcupados = await this.#repo.listarSlotsOcupadosPorData(dataFormatada);

  

    if (!config) {
      return res.status(404).json({ msg: "Configuração de agenda não encontrada" });
    }

    let inicio = null;
    let fim = null;
    const duracao = Number(config.duracaoSlotMinutos);
    const tipoDia = this.getTipoDia(dataFormatada);

    if (tipoDia === "fim_semana") {
      if (!config.horaInicioFimSemana || !config.horaFimFimSemana) {
        return res.status(200).json([]);
      }

      inicio = normalizarHora(config.horaInicioFimSemana);
      fim = normalizarHora(config.horaFimFimSemana);
    } else {
      if (!config.horaInicioSemana || !config.horaFimSemana) {
        return res.status(200).json([]);
      }

      inicio = normalizarHora(config.horaInicioSemana);
      fim = normalizarHora(config.horaFimSemana);
    }

    if (!inicio || !fim) {
      return res.status(200).json([]);
    }

    const [ano, mes, dia] = dataFormatada.split("-").map(Number);
    const diaSemana = new Date(ano, mes - 1, dia).getDay();

    const excecoesAplicaveis = todasExcecoes.filter((ex) => {
      if (ex.ativo === false || ex.ativo === 0 || ex.ativo === "0") {
        return false;
      }

      if (Number(ex.recorrente) === 1) {
        const dias = ex.diasSemana
          ? String(ex.diasSemana).split(",").map(Number)
          : [];
        return dias.includes(diaSemana);
      }

      return normalizarData(ex.data) === dataFormatada;
    });

    const slots = [];
    let atual = new Date(`1970-01-01T${inicio}`);
    const fimDate = new Date(`1970-01-01T${fim}`);

    while (atual < fimDate) {
      const hora = atual.toTimeString().slice(0, 8);
      const horaMin = this.#toMinutes(hora);

      const dentroDeExcecao = excecoesAplicaveis.some((ex) => {
        const inicioExMin = this.#toMinutes(ex.horaInicioExcecao);
        const fimExMin = this.#toMinutes(ex.horaFimExcecao);

        if (inicioExMin === null || fimExMin === null) {
          return false;
        }

        return horaMin >= inicioExMin && horaMin < fimExMin;
      });

      if (!dentroDeExcecao) {
        const bloqueado = bloqueios.some((b) => {
          return (
            normalizarData(b.data) === dataFormatada &&
            normalizarHora(b.slot) === hora
          );
        });

        const ocupado = slotsOcupados.some((s) => {
          const match =
            normalizarData(s.data) === dataFormatada &&
            normalizarHora(s.slot) === hora &&
            String(s.status).trim().toLowerCase() === "ativo";

          if (match) {
            console.log("MATCH ENCONTRADO:", {
              dataSlot: normalizarData(s.data),
              horaSlot: normalizarHora(s.slot),
              statusSlot: String(s.status).trim().toLowerCase(),
              hora,
            });
          }

          return match;
        });

        let status = "disponivel";
        if (bloqueado) {
          status = "bloqueado";
        } else if (ocupado) {
          status = "ocupado";
        }

        console.log("CHECK SLOT:", {
          hora,
          bloqueado,
          ocupado,
          status,
        });

        slots.push({
          slot: hora,
          bloqueado,
          ocupado,
          status,
        });
      }

      atual.setMinutes(atual.getMinutes() + duracao);
    }

    console.log("RESULTADO FINAL:", slots);

    return res.status(200).json(slots);
  } catch (err) {
    console.error("ERRO:", err);
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