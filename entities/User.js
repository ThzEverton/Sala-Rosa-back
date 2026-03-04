import Base from "./base.js";

export default class Usuario extends Base {
  #id;
  #nome;
  #email;
  #telefone;
  #dataNascimento;
  #perfil;
  #isConsultora;
  #ativo;
  #senha;

  get id() { return this.#id; }
  set id(v) { this.#id = v; }

  get nome() { return this.#nome; }
  set nome(v) { this.#nome = v; }

  get email() { return this.#email; }
  set email(v) { this.#email = v; }

  get telefone() { return this.#telefone; }
  set telefone(v) { this.#telefone = v; }

  get dataNascimento() { return this.#dataNascimento; }
  set dataNascimento(v) { this.#dataNascimento = v; }

  get perfil() { return this.#perfil; }
  set perfil(v) { this.#perfil = v; }

  get isConsultora() { return this.#isConsultora; }
  set isConsultora(v) { this.#isConsultora = v; }

  get ativo() { return this.#ativo; }
  set ativo(v) { this.#ativo = v; }

  get senha() { return this.#senha; }
  set senha(v) { this.#senha = v; }

  constructor(id = null, nome = null, email = null, telefone = null) {
    super();
    this.#id = id;
    this.#nome = nome;
    this.#email = email;
    this.#telefone = telefone;
    this.#dataNascimento = null;
    this.#perfil = "cliente";
    this.#isConsultora = 0;
    this.#ativo = 1;
    this.#senha = null;
  }
}