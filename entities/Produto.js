import Base from "./base.js";

export default class Produto extends Base {
  #id;
  #nome;
  #unidade;
  #precoVenda;
  #estoqueAtual;
  #estoqueMinimo;
  #ativo;

  get id() { return this.#id; }
  set id(v) { this.#id = v; }

  get nome() { return this.#nome; }
  set nome(v) { this.#nome = v; }

  get unidade() { return this.#unidade; }
  set unidade(v) { this.#unidade = v; }

  get precoVenda() { return this.#precoVenda; }
  set precoVenda(v) { this.#precoVenda = v; }

  get estoqueAtual() { return this.#estoqueAtual; }
  set estoqueAtual(v) { this.#estoqueAtual = v; }

  get estoqueMinimo() { return this.#estoqueMinimo; }
  set estoqueMinimo(v) { this.#estoqueMinimo = v; }

  get ativo() { return this.#ativo; }
  set ativo(v) { this.#ativo = v; }

  constructor(id = null, nome = null) {
    super();
    this.#id = id;
    this.#nome = nome;
    this.#unidade = null;
    this.#precoVenda = 0;
    this.#estoqueAtual = 0;
    this.#estoqueMinimo = 0;
    this.#ativo = 1;
  }
}