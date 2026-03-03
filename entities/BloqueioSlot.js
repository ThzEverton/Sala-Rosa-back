import Base from "./base.js";

export default class BloqueioSlot extends Base {
  #data;
  #slot;

  get data() { return this.#data; }
  set data(v) { this.#data = v; }

  get slot() { return this.#slot; }
  set slot(v) { this.#slot = v; }

  constructor(data = null, slot = null) {
    super();
    this.#data = data;
    this.#slot = slot;
  }
}