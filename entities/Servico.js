import Base from "./base.js";

export default class Servico extends Base {
  #id;
  #nome;
  #descricao;
  #preco;
  #duracaoMin;
  #ativo;
  #exclusivoParaConsultora;

  get id() { return this.#id; }
  set id(v) { this.#id = v; }

  get nome() { return this.#nome; }
  set nome(v) { this.#nome = v; }

  get descricao() { return this.#descricao; }
  set descricao(v) { this.#descricao = v; }

  get preco() { return this.#preco; }
  set preco(v) { this.#preco = v; }

  get duracaoMin() { return this.#duracaoMin; }
  set duracaoMin(v) { this.#duracaoMin = v; }

  get ativo() { return this.#ativo; }
  set ativo(v) { this.#ativo = v; }

  get exclusivoParaConsultora() { return this.#exclusivoParaConsultora; }
  set exclusivoParaConsultora(v) { this.#exclusivoParaConsultora = v; }

  constructor(id = null, nome = null) {
    super();
    this.#id = id;
    this.#nome = nome;
    this.#descricao = null;
    this.#preco = 0;
    this.#duracaoMin = 60;
    this.#ativo = 1;
    this.#exclusivoParaConsultora = 0;
  }
}