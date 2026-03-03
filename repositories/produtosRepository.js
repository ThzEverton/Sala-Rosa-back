import Database from "../db/database.js";
import Produto from "../entities/Produto.js";

export default class ProdutosRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

  async listar() {
    const sql = `select * from produtos order by nome`;
    const rows = await this.#banco.ExecutaComando(sql);
    return rows.map(r => this.toMap(r));
  }

  async obterPorId(id) {
    const sql = `select * from produtos where id=? limit 1`;
    const rows = await this.#banco.ExecutaComando(sql, [id]);
    return rows.length ? this.toMap(rows[0]) : null;
  }

  async criar(ent) {
    const sql = `
      insert into produtos (id, nome, unidade, preco_venda, estoque_atual, estoque_minimo, ativo)
      values (?, ?, ?, ?, ?, ?, ?)
    `;
    const vals = [
      ent.id, ent.nome, ent.unidade,
      ent.precoVenda, ent.estoqueAtual, ent.estoqueMinimo,
      ent.ativo ? 1 : 0
    ];
    return await this.#banco.ExecutaComandoNonQuery(sql, vals);
  }

  async atualizar(ent) {
    const sql = `
      update produtos
      set nome=?, unidade=?, preco_venda=?, estoque_atual=?, estoque_minimo=?, ativo=?
      where id=?
    `;
    const vals = [
      ent.nome, ent.unidade, ent.precoVenda,
      ent.estoqueAtual, ent.estoqueMinimo,
      ent.ativo ? 1 : 0,
      ent.id
    ];
    return await this.#banco.ExecutaComandoNonQuery(sql, vals);
  }

  toMap(row) {
    let p = new Produto();
    p.id = row["id"];
    p.nome = row["nome"];
    p.unidade = row["unidade"];
    p.precoVenda = row["preco_venda"];
    p.estoqueAtual = row["estoque_atual"];
    p.estoqueMinimo = row["estoque_minimo"];
    p.ativo = row["ativo"];
    return p;
  }
}