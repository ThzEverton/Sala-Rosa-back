import Base from "./base.js";

export default class HorarioConfig extends Base {
  #id;
  #horaInicioPadrao;
  #horaFimPadrao;
  #duracaoSlotMinutos;

  get id() { return this.#id; }
  set id(v) { this.#id = v; }

  get horaInicioPadrao() { return this.#horaInicioPadrao; }
  set horaInicioPadrao(v) { this.#horaInicioPadrao = v; }

  get horaFimPadrao() { return this.#horaFimPadrao; }
  set horaFimPadrao(v) { this.#horaFimPadrao = v; }

  get duracaoSlotMinutos() { return this.#duracaoSlotMinutos; }
  set duracaoSlotMinutos(v) { this.#duracaoSlotMinutos = v; }

  constructor(id = 1) {
    super();
    this.#id = id;
    this.#horaInicioPadrao = "08:00:00";
    this.#horaFimPadrao = "18:00:00";
    this.#duracaoSlotMinutos = 60;
  }
}