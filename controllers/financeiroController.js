import FinanceiroRepository from "../repositories/FinanceiroRepository.js";

export default class FinanceiroController {
  #repo;

  constructor() {
    this.#repo = new FinanceiroRepository();
  }

  // GET /financeiro?status=&inicio=&fim=
  async listar(req, res) {
    try {
      const { status, inicio, fim } = req.query;

      const filtros = {};
      if (status) filtros.status = status.toLowerCase();
      if (inicio) filtros.inicio = inicio;
      if (fim) filtros.fim = fim;

      const lancamentos = await this.#repo.listarComFiltros(filtros);

      const totalPago = lancamentos
        .filter((l) => l.status === "pago")
        .reduce((acc, l) => acc + Number(l.valor || 0), 0);

      const totalPendente = lancamentos
        .filter((l) => l.status === "pendente")
        .reduce((acc, l) => acc + Number(l.valor || 0), 0);

      const totalVendas = lancamentos
        .filter((l) => l.venda?.id && l.status === "pago")
        .reduce((acc, l) => acc + Number(l.valor || 0), 0);

      const totalAtendimentos = lancamentos
        .filter((l) => l.agendamento?.id && l.status === "pago")
        .reduce((acc, l) => acc + Number(l.valor || 0), 0);

      return res.status(200).json({
        registros: lancamentos,
        resumo: {
          totalPago,
          totalPendente,
          totalVendas,
          totalAtendimentos,
          totalRegistros: lancamentos.length,
        },
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ msg: "Erro ao listar lançamentos financeiros." });
    }
  }

  // GET /financeiro/:id
  async obterPorId(req, res) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ msg: "Id inválido." });

      const lancamento = await this.#repo.obterPorId(id);
      if (!lancamento) return res.status(404).json({ msg: "Lançamento não encontrado." });

      return res.status(200).json(lancamento);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ msg: "Erro ao obter lançamento." });
    }
  }

  // PATCH /financeiro/:id
  async atualizarStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, formaPagamento } = req.body;

      if (!id) return res.status(400).json({ msg: "Id inválido." });
      if (!status) return res.status(400).json({ msg: "Campo 'status' é obrigatório." });

      const statusValidos = ["pendente", "pago", "cancelado", "estornado"];
      const statusNorm = status.toLowerCase();

      if (!statusValidos.includes(statusNorm)) {
        return res.status(400).json({ msg: `Status inválido. Use: ${statusValidos.join(", ")}.` });
      }

      const lancamento = await this.#repo.obterPorId(id);
      if (!lancamento) return res.status(404).json({ msg: "Lançamento não encontrado." });

      // RN: apenas PENDENTE pode ser marcado como PAGO
      if (statusNorm === "pago" && lancamento.status !== "pendente") {
        return res.status(422).json({
          msg: `Apenas lançamentos PENDENTE podem ser marcados como PAGO. Status atual: ${lancamento.status.toUpperCase()}.`,
        });
      }

      // RN: CANCELADO e ESTORNADO não podem ser revertidos
      if (["cancelado", "estornado"].includes(lancamento.status)) {
        return res.status(422).json({
          msg: `Lançamento ${lancamento.status.toUpperCase()} não pode ser alterado.`,
        });
      }

      if (statusNorm === "pago") {
        await this.#repo.marcarComoPago(id, formaPagamento || lancamento.formaPagto);
      } else {
        await this.#repo.atualizarStatus(id, statusNorm);
      }

      return res.status(200).json({ msg: "Status atualizado." });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ msg: "Erro ao atualizar status do lançamento." });
    }
  }
}