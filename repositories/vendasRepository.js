import Database from "../db/database.js";
import Venda from "../entities/Venda.js";
import VendaItem from "../entities/vendaItem.js";
import Usuario from "../entities/User.js";
import Agendamento from "../entities/Agendamento.js";
import Produto from "../entities/Produto.js";
import Servico from "../entities/Servico.js";

export default class VendasRepository {
  #banco;

  constructor() {
    this.#banco = new Database();
  }

  async #temColunaClienteId() {
    const rows = await this.#banco.ExecutaComando(
      `select 1
       from information_schema.columns
       where table_schema = database()
         and table_name = 'vendas'
         and column_name = 'cliente_id'
       limit 1`
    );
    return rows.length > 0;
  }

  async #garantirColunaClienteId() {
    if (await this.#temColunaClienteId()) return;

    await this.#banco.ExecutaComando(
      `alter table vendas
       add column cliente_id int null after atendimento_id,
       add key idx_v_cliente (cliente_id),
       add constraint fk_v_cliente
         foreign key (cliente_id) references users(id)
         on delete set null
         on update cascade`
    );
  }

  async listar() {
    const temClienteId = await this.#temColunaClienteId();
    const camposCliente = temClienteId
      ? `v.cliente_id, c.nome as cliente_nome, c.email as cliente_email, c.telefone as cliente_telefone,`
      : `null as cliente_id, null as cliente_nome, null as cliente_email, null as cliente_telefone,`;
    const joinCliente = temClienteId
      ? `left join users c on c.id = v.cliente_id`
      : ``;

    const sqlVendas = `
      select
        v.id,
        v.usuario_responsavel_id,
        v.atendimento_id,
        ${camposCliente}
        v.data,
        v.valor_total,
        v.forma_pagto,
        v.status_pagto,
        v.observacao,
        v.created_at,
        u.nome as usuario_nome
      from vendas v
      left join users u on u.id = v.usuario_responsavel_id
      ${joinCliente}
      order by v.data desc, v.created_at desc
    `;
    const vendaRows = await this.#banco.ExecutaComando(sqlVendas, []);
    if (!vendaRows.length) return [];

    const ids = vendaRows.map(r => r.id);
    const placeholders = ids.map(() => "?").join(",");
    const sqlItens = `
      select
        vi.id,
        vi.venda_id,
        vi.tipo,
        vi.produto_id,
        vi.servico_id,
        vi.quantidade,
        vi.preco_unit,
        vi.subtotal,
        p.nome as produto_nome,
        s.nome as servico_nome
      from venda_itens vi
      left join produtos p on p.id = vi.produto_id
      left join servicos s on s.id = vi.servico_id
      where vi.venda_id in (${placeholders})
      order by vi.id asc
    `;
    const itenRows = await this.#banco.ExecutaComando(sqlItens, ids);

    const itensPorVenda = {};
    for (const r of itenRows) {
      if (!itensPorVenda[r.venda_id]) itensPorVenda[r.venda_id] = [];
      itensPorVenda[r.venda_id].push(this.toMapItem(r));
    }

    return vendaRows.map(r => {
      const v = this.toMapVenda(r);
      v.itens = itensPorVenda[r.id] || [];
      v.total = Number(r.valor_total);
      return v;
    });
  }

  async obterPorId(id) {
    const temClienteId = await this.#temColunaClienteId();
    const camposCliente = temClienteId
      ? `v.cliente_id, c.nome as cliente_nome, c.email as cliente_email, c.telefone as cliente_telefone,`
      : `null as cliente_id, null as cliente_nome, null as cliente_email, null as cliente_telefone,`;
    const joinCliente = temClienteId
      ? `left join users c on c.id = v.cliente_id`
      : ``;

    const sql = `
      select v.*, ${camposCliente} u.nome as usuario_nome
      from vendas v
      left join users u on u.id = v.usuario_responsavel_id
      ${joinCliente}
      where v.id = ? limit 1
    `;
    const rows = await this.#banco.ExecutaComando(sql, [id]);
    if (!rows.length) return null;

    const v = this.toMapVenda(rows[0]);
    v.itens = await this.listarItens(id);
    v.total = Number(rows[0].valor_total);
    return v;
  }

  async listarItens(vendaId) {
    const sql = `
      select
        vi.*,
        p.nome as produto_nome,
        s.nome as servico_nome
      from venda_itens vi
      left join produtos p on p.id = vi.produto_id
      left join servicos s on s.id = vi.servico_id
      where vi.venda_id = ?
      order by vi.id asc
    `;
    const rows = await this.#banco.ExecutaComando(sql, [vendaId]);
    return rows.map(r => this.toMapItem(r));
  }

 async criarVenda(venda, itensPayload = []) {
  if (!itensPayload || itensPayload.length === 0)
    throw new Error("Venda precisa de ao menos 1 item");

  // ✅ FIX: falha rápido antes de abrir transação
  if (!venda.usuarioResponsavel?.id) {
    throw new Error("Usuário responsável não identificado. Faça login novamente.");
  }

  const temClienteVinculado = Boolean(venda.clienteId);
  if (temClienteVinculado) {
    await this.#garantirColunaClienteId();
  }

  const tx = await this.#banco.getConnectionTx();
  try {
    // Venda avulsa pode ficar sem atendimento vinculado.
    const colunasCliente = temClienteVinculado ? ", cliente_id" : "";
    const valoresCliente = temClienteVinculado ? ", ?" : "";
    const paramsCliente = temClienteVinculado ? [venda.clienteId] : [];

    const vendaResult = await tx.query(
      `insert into vendas
        (usuario_responsavel_id, atendimento_id${colunasCliente}, data, valor_total, forma_pagto, status_pagto, observacao)
       values (?, ?${valoresCliente}, ?, ?, ?, ?, ?)`,
      [
        venda.usuarioResponsavel.id,
        venda.atendimento?.id || null,
        ...paramsCliente,
        venda.data,
        venda.valorTotal,
        venda.formaPagto || null,
        venda.statusPagto || "pendente",
        venda.observacao || null,
      ]
    );

      const vendaId = vendaResult.insertId;

      // 2) itens + estoque + movimentacoes
      for (const it of itensPayload) {
        if (it.tipo !== "produto" && it.tipo !== "servico")
          throw new Error("Tipo de item invalido");

        const qtd = Number(it.quantidade || 0);
        const unit = Number(it.valorUnitario || 0);
        if (qtd <= 0) throw new Error("Quantidade invalida");

        let produtoId = null;
        let servicoId = null;

        if (it.tipo === "produto") {
          produtoId = it.referenciaId;

          const pRows = await tx.query(
            `select estoque_atual from produtos where id=? for update`,
            [produtoId]
          );
          if (!pRows.length) throw new Error(`Produto ${produtoId} nao encontrado`);

          const estoqueAtual = Number(pRows[0].estoque_atual);
          if (estoqueAtual < qtd)
            throw new Error(`Estoque insuficiente para produto ${produtoId}`);

          await tx.query(
            `update produtos set estoque_atual = estoque_atual - ? where id=?`,
            [qtd, produtoId]
          );

          await tx.query(
            `insert into estoque_movimentacoes
             (produto_id, tipo, quantidade, data_ref, observacao, venda_id, agendamento_id, usuario_responsavel_id)
             values (?, 'saida', ?, ?, ?, ?, ?, ?)`,
            [
              produtoId,
              qtd,
              venda.data,
              `Venda #${vendaId}`,
              vendaId,
              venda.atendimento?.id || null,
              venda.usuarioResponsavel.id || null,
            ]
          );
        } else {
          servicoId = it.referenciaId;
          const sRows = await tx.query(
            `select 1 from servicos where id=? limit 1`,
            [servicoId]
          );
          if (!sRows.length) throw new Error(`Servico ${servicoId} nao encontrado`);
        }

        await tx.query(
          `insert into venda_itens
            (venda_id, tipo, produto_id, servico_id, quantidade, preco_unit)
           values (?, ?, ?, ?, ?, ?)`,
          [vendaId, it.tipo, produtoId, servicoId, qtd, unit]
        );
      }

      // 3) lancamento financeiro 1:1 — id omitido, AUTO_INCREMENT
      await tx.query(
        `insert into financeiro_lancamentos
          (descricao, valor, forma_pagto, status, data_ref, user_id, venda_id, agendamento_id)
         values (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `Venda #${vendaId}`,
          venda.valorTotal,
          venda.formaPagto || null,
          venda.statusPagto || "pendente",
          venda.data,
          venda.usuarioResponsavel.id || null,
          vendaId,
          venda.atendimento?.id || null,
        ]
      );

      await tx.commit();
      return vendaId;
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }


  async atualizarPagamento(vendaId, { formaPagto, statusPagto }) {
    const tx = await this.#banco.getConnectionTx();
    try {
      await tx.query(
        `update vendas set forma_pagto = ?, status_pagto = ? where id = ?`,
        [formaPagto, statusPagto, vendaId]
      );
      await tx.query(
        `update financeiro_lancamentos set forma_pagto = ?, status = ? where venda_id = ?`,
        [formaPagto, statusPagto, vendaId]
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
    v.usuarioResponsavel.nome = row["usuario_nome"] || null;

    v.atendimento = new Agendamento();
    v.atendimento.id = row["atendimento_id"] || null;

    v.clienteId = row["cliente_id"] || null;
    if (row["cliente_id"]) {
      v.cliente = new Usuario();
      v.cliente.id = row["cliente_id"];
      v.cliente.nome = row["cliente_nome"] || null;
      v.cliente.email = row["cliente_email"] || null;
      v.cliente.telefone = row["cliente_telefone"] || null;
    }

    v.data = row["data"];
    v.valorTotal = Number(row["valor_total"]);
    v.total = Number(row["valor_total"]);
    v.formaPagto = row["forma_pagto"];
    v.statusPagto = row["status_pagto"];
    v.observacao = row["observacao"];
    v.createdAt = row["created_at"];
    v.itens = [];

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
    vi.produto.nome = row["produto_nome"] || null;

    vi.servico = new Servico();
    vi.servico.id = row["servico_id"];
    vi.servico.nome = row["servico_nome"] || null;

    vi.nome = row["produto_nome"] || row["servico_nome"] || null;
    vi.quantidade = row["quantidade"];
    vi.precoUnit = row["preco_unit"];
    vi.subtotal = row["subtotal"];

    return vi;
  }
}
