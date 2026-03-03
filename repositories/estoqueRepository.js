import Database from "../db/database.js";
import EstoqueMovimentacao from "../entities/EstoqueMovimentacao.js";
import Produto from "../entities/Produto.js";
import Venda from "../entities/Venda.js";
import Agendamento from "../entities/Agendamento.js";
import Usuario from "../entities/User.js";

export default class EstoqueRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

  async listarMovimentacoes() {
    const sql = `
      select * from estoque_movimentacoes
      order by data_ref desc, created_at desc
    `;
    const rows = await this.#banco.ExecutaComando(sql, []);
    return rows.map(r => this.toMap(r));
  }

  // Regra igual tua fake: valida e atualiza produtos.estoque_atual
  async criarMovimentacao(ent) {
    const tx = await this.#banco.getConnectionTx();
    try {
      // trava o produto
      const prodRows = await tx.query(
        `select estoque_atual from produtos where id=? for update`,
        [ent.produto.id]
      );
      if (!prodRows.length) throw new Error("Produto nao encontrado");

      const estoqueAtual = Number(prodRows[0].estoque_atual);

      if (ent.tipo === "saida" && estoqueAtual < ent.quantidade) {
        throw new Error("Estoque insuficiente");
      }

      let novo = estoqueAtual;
      if (ent.tipo === "entrada") novo = estoqueAtual + ent.quantidade;
      else if (ent.tipo === "saida") novo = estoqueAtual - ent.quantidade;
      else if (ent.tipo === "ajuste") {
        novo = estoqueAtual + ent.quantidade;
        if (novo < 0) throw new Error("Ajuste resultaria em estoque negativo");
      } else {
        throw new Error("Tipo de movimentacao invalido");
      }

      await tx.query(`update produtos set estoque_atual=? where id=?`, [novo, ent.produto.id]);

      await tx.query(
        `insert into estoque_movimentacoes
         (id, produto_id, tipo, quantidade, data_ref, observacao, venda_id, agendamento_id, usuario_responsavel_id)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ent.id,
          ent.produto.id,
          ent.tipo,
          ent.quantidade,
          ent.dataRef,
          ent.observacao,
          ent.venda?.id || null,
          ent.agendamento?.id || null,
          ent.usuarioResponsavel?.id || null
        ]
      );

      await tx.commit();
      return true;
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  toMap(row) {
    let m = new EstoqueMovimentacao();
    m.id = row["id"];

    m.produto = new Produto();
    m.produto.id = row["produto_id"];

    m.tipo = row["tipo"];
    m.quantidade = row["quantidade"];
    m.dataRef = row["data_ref"];
    m.observacao = row["observacao"];

    m.venda = new Venda();
    m.venda.id = row["venda_id"];

    m.agendamento = new Agendamento();
    m.agendamento.id = row["agendamento_id"];

    m.usuarioResponsavel = new Usuario();
    m.usuarioResponsavel.id = row["usuario_responsavel_id"];

    return m;
  }
}