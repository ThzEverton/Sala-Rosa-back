import Base from "./base.js";
import Servico from "./Servico.js";
import Usuario from "./User.js";

export default class Agendamento extends Base {
  #id;
  #tipo;
  #servico;
  #data;
  #horaInicio;
  #horaFim;
  #status;
  #observacao;
  #criadoPor;

  get id() { return this.#id; }
  set id(v) { this.#id = v; }

  get tipo() { return this.#tipo; }
  set tipo(v) { this.#tipo = v; }

  get servico() { return this.#servico; }
  set servico(v) { this.#servico = v; }

  get data() { return this.#data; }
  set data(v) { this.#data = v; }

  get horaInicio() { return this.#horaInicio; }
  set horaInicio(v) { this.#horaInicio = v; }

  get horaFim() { return this.#horaFim; }
  set horaFim(v) { this.#horaFim = v; }

  get status() { return this.#status; }
  set status(v) { this.#status = v; }

  get observacao() { return this.#observacao; }
  set observacao(v) { this.#observacao = v; }

  get criadoPor() { return this.#criadoPor; }
  set criadoPor(v) { this.#criadoPor = v; }

  constructor() {
    super();
    this.#id = null;
    this.#tipo = "individual";
    this.#servico = new Servico();
    this.#data = null;
    this.#horaInicio = null;
    this.#horaFim = null;
    this.#status = "confirmado";
    this.#observacao = null;
    this.#criadoPor = new Usuario();
  }
}