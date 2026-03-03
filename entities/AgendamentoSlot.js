import Base from "./base.js";
import Agendamento from "./Agendamento.js";

export default class AgendamentoSlot extends Base {
  #data;
  #slot;
  #agendamento;
  #status;

  get data() { return this.#data; }
  set data(v) { this.#data = v; }

  get slot() { return this.#slot; }
  set slot(v) { this.#slot = v; }

  get agendamento() { return this.#agendamento; }
  set agendamento(v) { this.#agendamento = v; }

  get status() { return this.#status; }
  set status(v) { this.#status = v; }

  constructor() {
    super();
    this.#data = null;
    this.#slot = null;
    this.#agendamento = new Agendamento();
    this.#status = "ativo";
  }
}