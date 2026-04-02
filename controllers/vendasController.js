import VendasRepository from "../repositories/vendasRepository.js";
import Venda from "../entities/Venda.js";
import Agendamento from "../entities/Agendamento.js";
import Usuario from "../entities/User.js";

export default class VendaController {
  #repo;

  constructor() {
    this.#repo = new VendasRepository();
  }

  async listar(req, res) {
    try {
      const vendas = await this.#repo.listar();
      return res.status(200).json({ vendas });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao listar vendas" });
    }
  }

  async obterPorId(req, res) {
    try {
      const { id } = req.params;
      const venda = await this.#repo.obterPorId(id);
      if (!venda) {
        return res.status(404).json({ msg: "Venda não encontrada" });
      }
      return res.status(200).json(venda);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao obter venda" });
    }
  }

  async criar(req, res) {
    try {
      const { agendamentoId, itens, total, formaPagto, statusPagto, observacao } = req.body;

      if (!Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ msg: "A venda deve conter pelo menos 1 item" });
      }

      if (!formaPagto || !["dinheiro", "cartao", "pix"].includes(formaPagto)) {
        return res.status(400).json({ msg: "Forma de pagamento inválida. Use: dinheiro, cartao ou pix" });
      }

      for (const it of itens) {
        if (!it.tipo || !["produto", "servico"].includes(it.tipo)) {
          return res.status(400).json({ msg: `Tipo de item inválido: ${it.tipo}` });
        }
        if (!it.id) {
          return res.status(400).json({ msg: "Cada item deve informar o id" });
        }
        if (!it.quantidade || Number(it.quantidade) <= 0) {
          return res.status(400).json({ msg: `Quantidade inválida para o item ${it.nome || it.id}` });
        }
      }

      const venda = new Venda();
      // sem venda.id — o banco gera via AUTO_INCREMENT
      venda.data = new Date().toISOString().slice(0, 10);
      venda.valorTotal = Number(total) || 0;
      venda.formaPagto = formaPagto;
      venda.statusPagto = statusPagto || "pendente";
      venda.observacao = observacao || null;

      venda.usuarioResponsavel = new Usuario();
      venda.usuarioResponsavel.id = req.user?.id || null;

      venda.atendimento = new Agendamento();
      venda.atendimento.id = agendamentoId ? Number(agendamentoId) : null;

      const itensNormalizados = itens.map(it => ({
        tipo: it.tipo,
        referenciaId: it.id,
        quantidade: Number(it.quantidade),
        valorUnitario: Number(it.preco || 0),
      }));

      const vendaId = await this.#repo.criarVenda(venda, itensNormalizados);

      return res.status(201).json({ msg: "Venda registrada com sucesso", vendaId });
    } catch (error) {
      console.error(error);

      const negocio = ["Estoque insuficiente", "Produto", "Servico", "Venda precisa", "Tipo de item", "Quantidade"];
      const isNegocio = negocio.some(t => error.message?.includes(t));

      if (isNegocio) {
        return res.status(422).json({ msg: error.message });
      }

      return res.status(500).json({ msg: "Erro ao registrar venda" });
    }
  }

  async atualizarPagamento(req, res) {
    try {
      const { id } = req.params;
      const { formaPagto, statusPagto } = req.body;

      const statusValidos = ["pendente", "pago", "cancelado", "estornado"];
      const formasValidas = ["dinheiro", "cartao", "pix"];

      if (statusPagto && !statusValidos.includes(statusPagto)) {
        return res.status(400).json({ msg: `Status inválido. Use: ${statusValidos.join(", ")}` });
      }
      if (formaPagto && !formasValidas.includes(formaPagto)) {
        return res.status(400).json({ msg: `Forma de pagamento inválida. Use: ${formasValidas.join(", ")}` });
      }
      if (!formaPagto && !statusPagto) {
        return res.status(400).json({ msg: "Informe ao menos formaPagto ou statusPagto" });
      }

      const venda = await this.#repo.obterPorId(id);
      if (!venda) {
        return res.status(404).json({ msg: "Venda não encontrada" });
      }

      await this.#repo.atualizarPagamento(id, {
        formaPagto: formaPagto || venda.formaPagto,
        statusPagto: statusPagto || venda.statusPagto,
      });

      return res.status(200).json({ msg: "Pagamento atualizado com sucesso" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao atualizar pagamento" });
    }
  }
}