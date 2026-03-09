import Database from "../db/database.js";
import Servico from "../entities/Servico.js";

export default class ServicosRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

  async listar() {
    const sql = `select * from servicos order by nome`;
    const rows = await this.#banco.ExecutaComando(sql, []);
    return rows.map(r => this.toMap(r));
  }

  async listarVisiveis(isConsultora) {
    const sql = `
      select * from servicos
      where ativo = 1
        and (? = 1 or exclusivo_para_consultora = 0)
      order by nome
    `;
    const rows = await this.#banco.ExecutaComando(sql, [isConsultora ? 1 : 0]);
    return rows.map(r => this.toMap(r));
  }

  async obterPorId(id) {
    const sql = `select * from servicos where id = ? limit 1`;
    const rows = await this.#banco.ExecutaComando(sql, [id]);
    return rows.length ? this.toMap(rows[0]) : null;
  }

  async criar(ent) {
    const sql = `
      insert into servicos
      (nome, descricao, preco, duracao_min, ativo, exclusivo_para_consultora)
      values (?, ?, ?, ?, ?, ?)
    `;

    const vals = [
      ent.nome,
      ent.descricao,
      ent.preco,
      ent.duracaoMin,
      ent.ativo ? 1 : 0,
      ent.exclusivoParaConsultora ? 1 : 0
    ];

    return await this.#banco.ExecutaComandoNonQuery(sql, vals);
  }

  async atualizar(ent) {
    const sql = `
      update servicos
      set nome = ?, descricao = ?, preco = ?, duracao_min = ?, ativo = ?, exclusivo_para_consultora = ?
      where id = ?
    `;

    const vals = [
      ent.nome,
      ent.descricao,
      ent.preco,
      ent.duracaoMin,
      ent.ativo ? 1 : 0,
      ent.exclusivoParaConsultora ? 1 : 0,
      ent.id
    ];

    return await this.#banco.ExecutaComandoNonQuery(sql, vals);
  }

  toMap(row) {
    let s = new Servico();
    s.id = row["id"];
    s.nome = row["nome"];
    s.descricao = row["descricao"];
    s.preco = row["preco"];
    s.duracaoMin = row["duracao_min"];
    s.ativo = row["ativo"];
    s.exclusivoParaConsultora = row["exclusivo_para_consultora"];
    return s;
  }
}