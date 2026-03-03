import Base from "./base.js";
import Usuario from "./usuario.js";
import Venda from "./Venda.js";
import Agendamento from "./Agendamento.js";

export default class FinanceiroLancamento extends Base {
  #id;
  #descricao;
  #valor;
  #formaPagto;
  #status;
  #dataRef;
  #usuario;
  #venda;
  #agendamento;

  get id() { return this.#id; }
  set id(v) { this.#id = v; }

  get descricao() { return this.#descricao; }
  set descricao(v) { this.#descricao = v; }

  get valor() { return this.#valor; }
  set valor(v) { this.#valor = v; }

  get formaPagto() { return this.#formaPagto; }
  set formaPagto(v) { this.#formaPagto = v; }

  get status() { return this.#status; }
  set status(v) { this.#status = v; }

  get dataRef() { return this.#dataRef; }
  set dataRef(v) { this.#dataRef = v; }

  get usuario() { return this.#usuario; }
  set usuario(v) { this.#usuario = v; }

  get venda() { return this.#venda; }
  set venda(v) { this.#venda = v; }

  get agendamento() { return this.#agendamento; }
  set agendamento(v) { this.#agendamento = v; }

  constructor() {
    super();
    this.#id = null;
    this.#descricao = null;
    this.#valor = 0;
    this.#formaPagto = null;
    this.#status = "pendente";
    this.#dataRef = null;
    this.#usuario = new Usuario();
    this.#venda = new Venda();
    this.#agendamento = new Agendamento();
  }
}