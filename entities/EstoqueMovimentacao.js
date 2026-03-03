import Base from "./base.js";
import Produto from "./Produto.js";
import Venda from "./Venda.js";
import Agendamento from "./Agendamento.js";
import Usuario from "./User.js";

export default class EstoqueMovimentacao extends Base {
  #id;
  #produto;
  #tipo;
  #quantidade;
  #dataRef;
  #observacao;
  #venda;
  #agendamento;
  #usuarioResponsavel;

  get id() { return this.#id; }
  set id(v) { this.#id = v; }

  get produto() { return this.#produto; }
  set produto(v) { this.#produto = v; }

  get tipo() { return this.#tipo; }
  set tipo(v) { this.#tipo = v; }

  get quantidade() { return this.#quantidade; }
  set quantidade(v) { this.#quantidade = v; }

  get dataRef() { return this.#dataRef; }
  set dataRef(v) { this.#dataRef = v; }

  get observacao() { return this.#observacao; }
  set observacao(v) { this.#observacao = v; }

  get venda() { return this.#venda; }
  set venda(v) { this.#venda = v; }

  get agendamento() { return this.#agendamento; }
  set agendamento(v) { this.#agendamento = v; }

  get usuarioResponsavel() { return this.#usuarioResponsavel; }
  set usuarioResponsavel(v) { this.#usuarioResponsavel = v; }

  constructor() {
    super();
    this.#id = null;
    this.#produto = new Produto();
    this.#tipo = "entrada";
    this.#quantidade = 1;
    this.#dataRef = null;
    this.#observacao = null;
    this.#venda = new Venda();
    this.#agendamento = new Agendamento();
    this.#usuarioResponsavel = new Usuario();
  }
}