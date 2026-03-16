import Base from "./base.js";

export default class HorarioConfig extends Base {

  #id;

  #horaInicioPadrao;
  #horaFimPadrao;

  #horaInicioSemana;
  #horaFimSemana;

  #horaInicioFimSemana;
  #horaFimFimSemana;

  #duracaoSlotMinutos;

  get id() { return this.#id; }
  set id(v) { this.#id = v; }

  get horaInicioPadrao() { return this.#horaInicioPadrao; }
  set horaInicioPadrao(v) { this.#horaInicioPadrao = v; }

  get horaFimPadrao() { return this.#horaFimPadrao; }
  set horaFimPadrao(v) { this.#horaFimPadrao = v; }

  get horaInicioSemana() { return this.#horaInicioSemana; }
  set horaInicioSemana(v) { this.#horaInicioSemana = v; }

  get horaFimSemana() { return this.#horaFimSemana; }
  set horaFimSemana(v) { this.#horaFimSemana = v; }

  get horaInicioFimSemana() { return this.#horaInicioFimSemana; }
  set horaInicioFimSemana(v) { this.#horaInicioFimSemana = v; }

  get horaFimFimSemana() { return this.#horaFimFimSemana; }
  set horaFimFimSemana(v) { this.#horaFimFimSemana = v; }

  get duracaoSlotMinutos() { return this.#duracaoSlotMinutos; }
  set duracaoSlotMinutos(v) { this.#duracaoSlotMinutos = v; }

  constructor(id = 1) {
    super();

    this.#id = id;

    this.#horaInicioPadrao = "08:00:00";
    this.#horaFimPadrao = "18:00:00";

    this.#horaInicioSemana = "08:00:00";
    this.#horaFimSemana = "18:00:00";

    this.#horaInicioFimSemana = null;
    this.#horaFimFimSemana = null;

    this.#duracaoSlotMinutos = 60;
  }

}