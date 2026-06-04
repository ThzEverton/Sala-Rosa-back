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
    const {
      agendamentoId,
      clienteId,
      itens,
      total,
      formaPagto,
      statusPagto,
      observacao,
      valorPago,
      parcelado,
      qtdParcelas,
      valorParcela,
    } = req.body;

    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ msg: "A venda deve conter pelo menos 1 item" });
    }

    if (!formaPagto || !["dinheiro", "cartao", "pix"].includes(formaPagto)) {
      return res.status(400).json({ msg: "Forma de pagamento inválida. Use: dinheiro, cartao ou pix" });
    }

    const totalNum = Number(total) || 0;
    const valorPagoNum = Number(valorPago ?? (statusPagto === "pago" ? totalNum : 0));
    const qtdParcelasNum = Number(qtdParcelas || 1);

    if (valorPagoNum < 0) {
      return res.status(400).json({ msg: "Valor pago não pode ser negativo" });
    }
    if (valorPagoNum > totalNum) {
      return res.status(400).json({ msg: "Valor pago não pode ser maior que o total da venda" });
    }
    if (parcelado && (!Number.isInteger(qtdParcelasNum) || qtdParcelasNum < 2)) {
      return res.status(400).json({ msg: "Informe ao menos 2 parcelas para venda parcelada" });
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

    // ✅ FIX: lê o id do usuário logado de forma defensiva (compatível com diferentes formatos de middleware)
   
    const usuarioLogadoId = req.usuarioLogado?.id ?? null;
    if (!usuarioLogadoId) {
      return res.status(401).json({ msg: "Usuário não autenticado" });
    }

    const venda = new Venda();
    venda.data = new Date().toISOString().slice(0, 10);
    venda.valorTotal = totalNum;
    venda.valorPago = valorPagoNum;
    venda.valorRestante = Math.max(totalNum - valorPagoNum, 0);
    venda.parcelado = Boolean(parcelado);
    venda.qtdParcelas = venda.parcelado ? qtdParcelasNum : 1;
    venda.valorParcela = venda.parcelado
      ? Number(valorParcela || (totalNum / qtdParcelasNum).toFixed(2))
      : 0;
    venda.formaPagto = formaPagto;
    venda.statusPagto = this.#resolverStatusPagamento(totalNum, valorPagoNum, statusPagto);
    venda.observacao = observacao || null;

    venda.usuarioResponsavel = new Usuario();
    venda.usuarioResponsavel.id = usuarioLogadoId;

    venda.atendimento = new Agendamento();
    venda.atendimento.id = agendamentoId ? Number(agendamentoId) : null;

    
    venda.clienteId = clienteId ? Number(clienteId) : null;

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
    const negocio = ["Estoque insuficiente", "Produto", "Servico", "Venda precisa", "Tipo de item", "Quantidade", "Usuário responsável"];
    const isNegocio = negocio.some(t => error.message?.includes(t));
    if (isNegocio) return res.status(422).json({ msg: error.message });
    return res.status(500).json({ msg: "Erro ao registrar venda" });
  }
}

  async atualizarPagamento(req, res) {
    try {
      const { id } = req.params;
      const { formaPagto, statusPagto, valorPago, parcelado, qtdParcelas, valorParcela } = req.body;

      const statusValidos = ["pendente", "parcial", "pago", "cancelado", "estornado"];
      const formasValidas = ["dinheiro", "cartao", "pix"];

      if (statusPagto && !statusValidos.includes(statusPagto)) {
        return res.status(400).json({ msg: `Status inválido. Use: ${statusValidos.join(", ")}` });
      }
      if (formaPagto && !formasValidas.includes(formaPagto)) {
        return res.status(400).json({ msg: `Forma de pagamento inválida. Use: ${formasValidas.join(", ")}` });
      }
      if (!formaPagto && !statusPagto && valorPago === undefined && parcelado === undefined && qtdParcelas === undefined && valorParcela === undefined) {
        return res.status(400).json({ msg: "Informe ao menos formaPagto, statusPagto, valorPago ou dados do parcelamento" });
      }

      const venda = await this.#repo.obterPorId(id);
      if (!venda) {
        return res.status(404).json({ msg: "Venda não encontrada" });
      }

      const totalNum = Number(venda.valorTotal ?? venda.total ?? 0);
      const valorPagoNum = valorPago === undefined ? Number(venda.valorPago || 0) : Number(valorPago);
      const parceladoFinal = parcelado === undefined ? Boolean(venda.parcelado) : Boolean(parcelado);
      const qtdParcelasFinal = qtdParcelas === undefined ? Number(venda.qtdParcelas || 1) : Number(qtdParcelas);

      if (valorPagoNum < 0) {
        return res.status(400).json({ msg: "Valor pago não pode ser negativo" });
      }
      if (valorPagoNum > totalNum) {
        return res.status(400).json({ msg: "Valor pago não pode ser maior que o total da venda" });
      }
      if (parceladoFinal && (!Number.isInteger(qtdParcelasFinal) || qtdParcelasFinal < 2)) {
        return res.status(400).json({ msg: "Informe ao menos 2 parcelas para venda parcelada" });
      }

      await this.#repo.atualizarPagamento(id, {
        formaPagto: formaPagto || venda.formaPagto,
        statusPagto: this.#resolverStatusPagamento(totalNum, valorPagoNum, statusPagto),
        valorPago: valorPagoNum,
        valorRestante: Math.max(totalNum - valorPagoNum, 0),
        parcelado: parceladoFinal,
        qtdParcelas: parceladoFinal ? qtdParcelasFinal : 1,
        valorParcela: parceladoFinal
          ? Number(valorParcela || venda.valorParcela || (totalNum / qtdParcelasFinal).toFixed(2))
          : 0,
      });

      return res.status(200).json({ msg: "Pagamento atualizado com sucesso" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao atualizar pagamento" });
    }
  }

  #resolverStatusPagamento(total, valorPago, statusInformado) {
    if (["cancelado", "estornado"].includes(statusInformado)) return statusInformado;
    if (valorPago <= 0) return "pendente";
    if (valorPago >= total) return "pago";
    return "parcial";
  }
}
