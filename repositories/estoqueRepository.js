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
      select 
        em.id,
        em.produto_id,
        p.nome as produto_nome,
        em.tipo,
        em.quantidade,
        em.data_ref,
        em.observacao,
        em.venda_id,
        em.agendamento_id,
        em.usuario_responsavel_id,
        u.nome as usuario_nome,
        em.created_at
      from estoque_movimentacoes em
      inner join produtos p on p.id = em.produto_id
      left join users u on u.id = em.usuario_responsavel_id
      order by em.data_ref desc, em.created_at desc
    `;
    const rows = await this.#banco.ExecutaComando(sql, []);
    return rows.map(r => this.toMap(r));
  }

  async criarMovimentacao(ent) {
    const tx = await this.#banco.getConnectionTx();

    try {
      const prodRows = await tx.query(
        `select id, estoque_atual from produtos where id = ? for update`,
        [ent.produto.id]
      );

      if (!prodRows.length) {
        throw new Error("Produto não encontrado");
      }

      const estoqueAtual = Number(prodRows[0].estoque_atual);
      const quantidade = Number(ent.quantidade);

      if (quantidade <= 0) {
        throw new Error("Quantidade deve ser maior que zero");
      }

      let novoEstoque = estoqueAtual;

      if (ent.tipo === "entrada") {
        novoEstoque = estoqueAtual + quantidade;
      } else if (ent.tipo === "saida") {
        if (estoqueAtual < quantidade) {
          throw new Error("Estoque insuficiente");
        }
        novoEstoque = estoqueAtual - quantidade;
      } else if (ent.tipo === "ajuste") {
        novoEstoque = estoqueAtual + quantidade;

        if (novoEstoque < 0) {
          throw new Error("Ajuste resultaria em estoque negativo");
        }
      } else {
        throw new Error("Tipo de movimentação inválido");
      }

      await tx.query(
        `update produtos set estoque_atual = ? where id = ?`,
        [novoEstoque, ent.produto.id]
      );

      await tx.query(
        `insert into estoque_movimentacoes
        (produto_id, tipo, quantidade, data_ref, observacao, venda_id, agendamento_id, usuario_responsavel_id)
        values (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ent.produto.id,
          ent.tipo,
          quantidade,
          ent.dataRef,
          ent.observacao,
          ent.venda?.id || null,
          ent.agendamento?.id || null,
          ent.usuarioResponsavel?.id || null
        ]
      );

      await tx.commit();
      return true;
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      if (tx.release) tx.release();
    }
  }

  toMap(row) {
    let m = new EstoqueMovimentacao();
    m.id = row["id"];

    m.produto = new Produto();
    m.produto.id = row["produto_id"];
    m.produto.nome = row["produto_nome"];

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
    m.usuarioResponsavel.nome = row["usuario_nome"];

    return m;
  }
}