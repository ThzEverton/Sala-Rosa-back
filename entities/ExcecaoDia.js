import Base from "./base.js";

export default class ExcecaoDia extends Base {
  #data;
  #horaInicioExcecao;
  #horaFimExcecao;

  get data() { return this.#data; }
  set data(v) { this.#data = v; }

  get horaInicioExcecao() { return this.#horaInicioExcecao; }
  set horaInicioExcecao(v) { this.#horaInicioExcecao = v; }

  get horaFimExcecao() { return this.#horaFimExcecao; }
  set horaFimExcecao(v) { this.#horaFimExcecao = v; }

  constructor(data = null) {
    super();
    this.#data = data;
    this.#horaInicioExcecao = null;
    this.#horaFimExcecao = null;
  }
}