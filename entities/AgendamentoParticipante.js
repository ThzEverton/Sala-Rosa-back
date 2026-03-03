import Base from "./base.js";
import Usuario from "./User.js";
import Agendamento from "./Agendamento.js";

export default class AgendamentoParticipante extends Base {
  #agendamento;
  #usuario;
  #nomeNoMomento;

  get agendamento() { return this.#agendamento; }
  set agendamento(v) { this.#agendamento = v; }

  get usuario() { return this.#usuario; }
  set usuario(v) { this.#usuario = v; }

  get nomeNoMomento() { return this.#nomeNoMomento; }
  set nomeNoMomento(v) { this.#nomeNoMomento = v; }

  constructor() {
    super();
    this.#agendamento = new Agendamento();
    this.#usuario = new Usuario();
    this.#nomeNoMomento = null;
  }
}