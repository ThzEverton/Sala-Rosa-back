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