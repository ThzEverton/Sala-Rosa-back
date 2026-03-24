import Base from "./base.js";

export default class ExcecaoDia extends Base {
  #id;
  #data;
  #horaInicioExcecao;
  #horaFimExcecao;
  #recorrente;
  #diasSemana;
  #ativo;

  get id() { return this.#id; }
  set id(v) { this.#id = v; }

  get data() { return this.#data; }
  set data(v) { this.#data = v; }

  get horaInicioExcecao() { return this.#horaInicioExcecao; }
  set horaInicioExcecao(v) { this.#horaInicioExcecao = v; }

  get horaFimExcecao() { return this.#horaFimExcecao; }
  set horaFimExcecao(v) { this.#horaFimExcecao = v; }

  get recorrente() { return this.#recorrente; }
  set recorrente(v) { this.#recorrente = v; }

  get diasSemana() { return this.#diasSemana; }
  set diasSemana(v) { this.#diasSemana = v; }

  get ativo() { return this.#ativo; }
  set ativo(v) { this.#ativo = v; }

  constructor(data = null) {
    super();
    this.#id = null;
    this.#data = data;
    this.#horaInicioExcecao = null;
    this.#horaFimExcecao = null;
    this.#recorrente = 0;
    this.#diasSemana = null;
    this.#ativo = 1;
  }
}