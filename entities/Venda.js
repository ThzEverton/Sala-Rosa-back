import Base from "./base.js";
import Usuario from "./User.js";
import Agendamento from "./Agendamento.js";

export default class Venda extends Base {
  #id;
  #usuarioResponsavel;
  #atendimento;
  #data;
  #valorTotal;
  #total;        // alias usado pelo front (v?.total)
  #formaPagto;
  #statusPagto;
  #observacao;
  #itens;        // array de VendaItem — preenchido pelo listar()
  #createdAt;

  get id() { return this.#id; }
  set id(v) { this.#id = v; }

  get usuarioResponsavel() { return this.#usuarioResponsavel; }
  set usuarioResponsavel(v) { this.#usuarioResponsavel = v; }

  get atendimento() { return this.#atendimento; }
  set atendimento(v) { this.#atendimento = v; }

  get data() { return this.#data; }
  set data(v) { this.#data = v; }

  get valorTotal() { return this.#valorTotal; }
  set valorTotal(v) { this.#valorTotal = v; }

  get total() { return this.#total; }
  set total(v) { this.#total = v; }

  get formaPagto() { return this.#formaPagto; }
  set formaPagto(v) { this.#formaPagto = v; }

  get statusPagto() { return this.#statusPagto; }
  set statusPagto(v) { this.#statusPagto = v; }

  get observacao() { return this.#observacao; }
  set observacao(v) { this.#observacao = v; }

  get itens() { return this.#itens; }
  set itens(v) { this.#itens = v; }

  get createdAt() { return this.#createdAt; }
  set createdAt(v) { this.#createdAt = v; }

  constructor() {
    super();
    this.#id = null;
    this.#usuarioResponsavel = new Usuario();
    this.#atendimento = new Agendamento();
    this.#data = null;
    this.#valorTotal = 0;
    this.#total = 0;
    this.#formaPagto = null;
    this.#statusPagto = "pendente";
    this.#observacao = null;
    this.#itens = [];
    this.#createdAt = null;
  }
}