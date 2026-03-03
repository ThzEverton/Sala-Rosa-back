import Database from "../db/database.js";
import Venda from "../entities/Venda.js";
import VendaItem from "../entities/vendaItem.js";
import Usuario from "../entities/usuario.js";
import Agendamento from "../entities/Agendamento.js";
import Produto from "../entities/Produto.js";
import Servico from "../entities/Servico.js";

export default class VendasRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

  async listar() {
    const sql = `select * from vendas order by data desc, created_at desc`;
    const rows = await this.#banco.ExecutaComando(sql, []);
    return rows.map(r => this.toMapVenda(r));
  }

  async obterPorId(id) {
    const sql = `select * from vendas where id=? limit 1`;
    const rows = await this.#banco.ExecutaComando(sql, [id]);
    return rows.length ? this.toMapVenda(rows[0]) : null;
  }

  async listarItens(vendaId) {
    const sql = `select * from venda_itens where venda_id=? order by id asc`;
    const rows = await this.#banco.ExecutaComando(sql, [vendaId]);
    return rows.map(r => this.toMapItem(r));
  }

  // data:
  //  venda: Venda (id, usuarioResponsavel.id, atendimento.id(opc), data, valorTotal, formaPagto, statusPagto)
  //  itens: [{tipo:'produto'|'servico', referenciaId:'p1'|'s1', quantidade, valorUnitario}]
  async criarVenda(venda, itensPayload = []) {
    if (!itensPayload || itensPayload.length === 0) throw new Error("Venda precisa de ao menos 1 item");

    const tx = await this.#banco.getConnectionTx();
    try {
      // 1) insert venda
      await tx.query(
        `insert into vendas
          (id, usuario_responsavel_id, atendimento_id, data, valor_total, forma_pagto, status_pagto, observacao)
         values
          (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          venda.id,
          venda.usuarioResponsavel.id,
          venda.atendimento?.id || null,
          venda.data,
          venda.valorTotal,
          venda.formaPagto,
          venda.statusPagto || "pendente",
          venda.observacao
        ]
      );

      // 2) itens + baixa de estoque + movimentacoes
      for (const it of itensPayload) {
        if (it.tipo !== "produto" && it.tipo !== "servico") throw new Error("Tipo de item invalido");

        const qtd = Number(it.quantidade || 0);
        const unit = Number(it.valorUnitario || 0);
        if (qtd <= 0) throw new Error("Quantidade invalida");

        const subtotal = qtd * unit;

        let produtoId = null;
        let servicoId = null;

        if (it.tipo === "produto") {
          produtoId = it.referenciaId;

          // trava produto e valida estoque
          const pRows = await tx.query(`select estoque_atual from produtos where id=? for update`, [produtoId]);
          if (!pRows.length) throw new Error(`Produto ${produtoId} nao encontrado`);

          const estoqueAtual = Number(pRows[0].estoque_atual);
          if (estoqueAtual < qtd) throw new Error(`Estoque insuficiente para produto ${produtoId}`);

          // baixa estoque
          await tx.query(`update produtos set estoque_atual = estoque_atual - ? where id=?`, [qtd, produtoId]);

          // movimentacao saida
          await tx.query(
            `insert into estoque_movimentacoes
             (id, produto_id, tipo, quantidade, data_ref, observacao, venda_id, agendamento_id, usuario_responsavel_id)
             values (?, ?, 'saida', ?, ?, ?, ?, ?, ?)`,
            [
              this.#genId("m"),
              produtoId,
              qtd,
              venda.data,
              `Venda ${venda.id}`,
              venda.id,
              venda.atendimento?.id || null,
              venda.usuarioResponsavel.id
            ]
          );
        } else {
          servicoId = it.referenciaId;

          // opcional: garantir que existe
          const sRows = await tx.query(`select 1 from servicos where id=? limit 1`, [servicoId]);
          if (!sRows.length) throw new Error(`Servico ${servicoId} nao encontrado`);
        }

        await tx.query(
          `insert into venda_itens
            (venda_id, tipo, produto_id, servico_id, quantidade, preco_unit, subtotal)
           values
            (?, ?, ?, ?, ?, ?, ?)`,
          [venda.id, it.tipo, produtoId, servicoId, qtd, unit, subtotal]
        );
      }

      // 3) financeiro 1:1 por venda (respeita UNIQUE uq_fin_venda)
      await tx.query(
        `insert into financeiro_lancamentos
          (id, descricao, valor, forma_pagto, status, data_ref, user_id, venda_id, agendamento_id)
         values
          (?, ?, ?, NULL, 'pendente', ?, NULL, ?, ?)`,
        [
          this.#genId("f"),
          `Venda ${venda.id}`,
          venda.valorTotal,
          venda.data,
          venda.id,
          venda.atendimento?.id || null
        ]
      );

      await tx.commit();
      return true;
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  toMapVenda(row) {
    let v = new Venda();
    v.id = row["id"];

    v.usuarioResponsavel = new Usuario();
    v.usuarioResponsavel.id = row["usuario_responsavel_id"];

    v.atendimento = new Agendamento();
    v.atendimento.id = row["atendimento_id"];

    v.data = row["data"];
    v.valorTotal = row["valor_total"];
    v.formaPagto = row["forma_pagto"];
    v.statusPagto = row["status_pagto"];
    v.observacao = row["observacao"];

    return v;
  }

  toMapItem(row) {
    let vi = new VendaItem();
    vi.id = row["id"];

    vi.venda = new Venda();
    vi.venda.id = row["venda_id"];

    vi.tipo = row["tipo"];

    vi.produto = new Produto();
    vi.produto.id = row["produto_id"];

    vi.servico = new Servico();
    vi.servico.id = row["servico_id"];

    vi.quantidade = row["quantidade"];
    vi.precoUnit = row["preco_unit"];
    vi.subtotal = row["subtotal"];

    return vi;
  }

  #genId(prefix) {
    return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
}