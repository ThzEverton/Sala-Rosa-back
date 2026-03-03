import Base from "./base.js";
import Venda from "./Venda.js";
import Produto from "./Produto.js";
import Servico from "./Servico.js";

export default class VendaItem extends Base {
  #id;
  #venda;
  #tipo;
  #produto;
  #servico;
  #quantidade;
  #precoUnit;
  #subtotal;

  get id() { return this.#id; }
  set id(v) { this.#id = v; }

  get venda() { return this.#venda; }
  set venda(v) { this.#venda = v; }

  get tipo() { return this.#tipo; }
  set tipo(v) { this.#tipo = v; }

  get produto() { return this.#produto; }
  set produto(v) { this.#produto = v; }

  get servico() { return this.#servico; }
  set servico(v) { this.#servico = v; }

  get quantidade() { return this.#quantidade; }
  set quantidade(v) { this.#quantidade = v; }

  get precoUnit() { return this.#precoUnit; }
  set precoUnit(v) { this.#precoUnit = v; }

  get subtotal() { return this.#subtotal; }
  set subtotal(v) { this.#subtotal = v; }

  constructor() {
    super();
    this.#id = null;
    this.#venda = new Venda();
    this.#tipo = "produto";
    this.#produto = new Produto();
    this.#servico = new Servico();
    this.#quantidade = 1;
    this.#precoUnit = 0;
    this.#subtotal = 0;
  }
}