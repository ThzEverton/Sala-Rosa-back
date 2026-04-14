import AgendamentosRepository from "../repositories/agendamentosRepository.js";

export default class AgendamentosController {
  #repo;

  constructor() {
    this.#repo = new AgendamentosRepository();
  }

 async listar(req, res) {
    try {
      const { data, status, tipo } = req.query;
 
      const usuario = req.usuarioLogado;
 
      // gerente vê tudo — cliente vê apenas os seus
      const isGerente =
        usuario?.perfil === "gerente" || usuario?.role === "gerente";
 
      const userId = isGerente ? null : Number(usuario?.id);
 
      const lista = await this.#repo.listar(
        data   || null,
        userId || null,
        status || null,
        tipo   || null
      );
 
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
 
      return res.status(200).json({ agendamento, participantes });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao buscar agendamento" });
    }
  }

    async remarcar(req, res) {
    try {
      const { id } = req.params;
      const { novaData, novoHorario } = req.body;

      const idNum = Number(id);

      if (!id || Number.isNaN(idNum)) {
        return res.status(400).json({ msg: "ID inválido" });
      }

      if (!novaData || !novoHorario) {
        return res.status(400).json({
          msg: "novaData e novoHorario são obrigatórios"
        });
      }

      await this.#repo.remarcar({
        id: idNum,
        novaData: String(novaData).slice(0, 10),
        novoHorario: String(novoHorario).slice(0, 8)
      });

      return res.status(200).json({
        msg: "Agendamento remarcado com sucesso"
      });
    } catch (error) {
      console.error(error);

      const mensagem = error.message || "Erro ao remarcar agendamento";

      if (mensagem.includes("Agendamento não encontrado")) {
        return res.status(404).json({ msg: mensagem });
      }

      if (
        mensagem.includes("Já existe agendamento nesse horário") ||
        mensagem.includes("Existe bloqueio nesse horário") ||
        mensagem.includes("Horário fora da agenda padrão") ||
        mensagem.includes("Horário indisponível por exceção da agenda") ||
        mensagem.includes("Agenda não configurada para este dia") ||
        mensagem.includes("Agendamento cancelado") ||
        mensagem.includes("Agendamento concluído")
      ) {
        return res.status(400).json({ msg: mensagem });
      }

      return res.status(500).json({
        msg: mensagem
      });
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
      return res.status(401).json({
        msg: "Usuário não autenticado"
      });
    }

    const id = await this.#repo.criar({
      servicoId: Number(servicoId),
      data: String(data).slice(0, 10),
      horaInicio: String(horaInicio).slice(0, 8),
      observacao: observacao ?? null,
      userId: Number(req.usuarioLogado.id),
      nomeUser: req.usuarioLogado.nome
    });

    return res.status(201).json({
      msg: "Agendamento criado com sucesso",
      id
    });
  } catch (error) {
    console.error(error);

    const mensagem = error.message || "Erro ao criar agendamento";

    if (
      mensagem.includes("não encontrado") ||
      mensagem.includes("Configuração da agenda não encontrada")
    ) {
      return res.status(404).json({ msg: mensagem });
    }

    if (
      mensagem.includes("Já existe agendamento nesse horário") ||
      mensagem.includes("Existe bloqueio nesse horário") ||
      mensagem.includes("Horário fora da agenda padrão") ||
      mensagem.includes("Horário indisponível por exceção da agenda") ||
      mensagem.includes("Agenda não configurada para este dia")
    ) {
      return res.status(400).json({ msg: mensagem });
    }

    return res.status(500).json({
      msg: mensagem
    });
  }
} 
async criarComoGerente(req, res) {
  try {
    const { servicoId, data, horaInicio, observacao, paraUserId } = req.body

    if (!servicoId || !data || !horaInicio) {
      return res.status(400).json({ msg: 'servicoId, data e horaInicio são obrigatórios' })
    }

    if (!req.usuarioLogado?.id) {
      return res.status(401).json({ msg: 'Usuário não autenticado' })
    }

    const isGerente =
      req.usuarioLogado?.perfil === 'gerente' ||
      req.usuarioLogado?.role === 'gerente'

    if (!isGerente) {
      return res.status(403).json({ msg: 'Acesso restrito a gerentes' })
    }

    if (!paraUserId) {
      return res.status(400).json({ msg: 'paraUserId é obrigatório' })
    }

    const id = await this.#repo.criarComoGerente({
      servicoId:      Number(servicoId),
      data:           String(data).slice(0, 10),
      horaInicio:     String(horaInicio).slice(0, 8),
      observacao:     observacao ?? null,
      userId:         Number(req.usuarioLogado.id),
      destinatarioId: Number(paraUserId),
    })

    return res.status(201).json({ msg: 'Agendamento criado com sucesso', id })
  } catch (error) {
    console.error(error)

    const mensagem = error.message || 'Erro ao criar agendamento'

    if (
      mensagem.includes('não encontrado') ||
      mensagem.includes('Configuração da agenda não encontrada')
    ) {
      return res.status(404).json({ msg: mensagem })
    }

    if (
      mensagem.includes('Já existe agendamento nesse horário') ||
      mensagem.includes('Existe bloqueio nesse horário') ||
      mensagem.includes('Horário fora da agenda padrão') ||
      mensagem.includes('Horário indisponível por exceção da agenda') ||
      mensagem.includes('Agenda não configurada para este dia')
    ) {
      return res.status(400).json({ msg: mensagem })
    }

    return res.status(500).json({ msg: mensagem })
  }
}
  async cancelar(req, res) {
  try {
    const { id } = req.params;

    const idNum = Number(id);

    if (!id || isNaN(idNum)) {
      return res.status(400).json({
        msg: "ID inválido"
      });
    }

    await this.#repo.cancelar(idNum);

    return res.status(200).json({
      msg: "Agendamento cancelado com sucesso"
    });
  } catch (error) {
    console.error(error);

    const mensagem = error.message || "Erro ao cancelar agendamento";

    if (mensagem.includes("Agendamento não encontrado")) {
      return res.status(404).json({ msg: mensagem });
    }

    if (mensagem.includes("Agendamento já está cancelado")) {
      return res.status(400).json({ msg: mensagem });
    }

    return res.status(500).json({
      msg: mensagem
    });
  }
}
}