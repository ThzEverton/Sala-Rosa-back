import EstoqueRepository from "../repositories/estoqueRepository.js";
import EstoqueMovimentacao from "../entities/EstoqueMovimentacao.js";
import Produto from "../entities/Produto.js";
import Venda from "../entities/Venda.js";
import Agendamento from "../entities/Agendamento.js";
import Usuario from "../entities/User.js";

export default class EstoqueController {
  #repo;

  constructor() {
    this.#repo = new EstoqueRepository();
  }

  async listar(req, res) {
    try {
      const lista = await this.#repo.listarMovimentacoes();
      return res.status(200).json(lista);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Erro ao listar movimentações de estoque" });
    }
  }

  async criar(req, res) {
    try {
      const {
        produtoId,
        tipo,
        quantidade,
        dataRef,
        observacao,
        vendaId,
        agendamentoId
      } = req.body;

      if (!produtoId || !tipo || !quantidade || !dataRef) {
        return res.status(400).json({
          msg: "produtoId, tipo, quantidade e dataRef são obrigatórios"
        });
      }

      let mov = new EstoqueMovimentacao();

      mov.produto = new Produto();
      mov.produto.id = Number(produtoId);

      mov.tipo = tipo;
      mov.quantidade = Number(quantidade);
      mov.dataRef = dataRef;
      mov.observacao = observacao || null;

      mov.venda = new Venda();
      mov.venda.id = vendaId || null;

      mov.agendamento = new Agendamento();
      mov.agendamento.id = agendamentoId || null;

      mov.usuarioResponsavel = new Usuario();
      mov.usuarioResponsavel.id = req.user?.id || null;

      const ok = await this.#repo.criarMovimentacao(mov);

      if (!ok) {
        return res.status(400).json({ msg: "Não foi possível registrar movimentação" });
      }

      return res.status(201).json({ msg: "Movimentação registrada com sucesso" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: error.message || "Erro ao registrar movimentação" });
    }
  }
}