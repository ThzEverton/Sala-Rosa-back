import UsersRepository from "../repositories/usersRepository.js";
import Usuario from "../entities/User.js";

export default class UsersController {
  #repo;

  constructor() {
    this.#repo = new UsersRepository();
  }

  // GET /users
  async listar(req, res) {
    try {
      const lista = await this.#repo.listar();
      return res.status(200).json(lista);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ msg: "Erro ao listar usuários." });
    }
  }

  // GET /users/:id
  async obter(req, res) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ msg: "Id inválido." });

      const user = await this.#repo.obterPorId(id);
      if (!user) return res.status(404).json({ msg: "Usuário não encontrado." });

      return res.status(200).json(user);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ msg: "Erro ao obter usuário." });
    }
  }

  // POST /users
  async criar(req, res) {
    try {
      const { id, nome, email, telefone, dataNascimento, perfil, isConsultora, ativo, senhaHash } = req.body;

      if (!id) return res.status(400).json({ msg: "Id é obrigatório (VARCHAR)." });
      if (!nome || nome.trim().length < 2) return res.status(400).json({ msg: "Nome inválido." });
      if (!email || !email.includes("@")) return res.status(400).json({ msg: "Email inválido." });

      let u = new Usuario();
      u.id = id;
      u.nome = nome;
      u.email = email;
      u.telefone = telefone || null;
      u.dataNascimento = dataNascimento || null;
      u.perfil = perfil || "cliente";
      u.isConsultora = isConsultora ? 1 : 0;
      u.ativo = ativo === undefined ? 1 : (ativo ? 1 : 0);
      u.senhaHash = senhaHash || null;

      const ok = await this.#repo.criar(u);
      if (!ok) return res.status(400).json({ msg: "Não foi possível criar usuário." });

      return res.status(201).json({ msg: "Usuário criado.", id: u.id });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ msg: "Erro ao criar usuário." });
    }
  }

  // PUT /users/:id
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const { nome, email, telefone, dataNascimento, perfil, isConsultora, ativo } = req.body;

      if (!id) return res.status(400).json({ msg: "Id inválido." });

      const atual = await this.#repo.obterPorId(id);
      if (!atual) return res.status(404).json({ msg: "Usuário não encontrado." });

      if (nome !== undefined) atual.nome = nome;
      if (email !== undefined) atual.email = email;
      if (telefone !== undefined) atual.telefone = telefone;
      if (dataNascimento !== undefined) atual.dataNascimento = dataNascimento;
      if (perfil !== undefined) atual.perfil = perfil;
      if (isConsultora !== undefined) atual.isConsultora = isConsultora ? 1 : 0;
      if (ativo !== undefined) atual.ativo = ativo ? 1 : 0;

      const ok = await this.#repo.atualizar(atual);
      if (!ok) return res.status(400).json({ msg: "Não foi possível atualizar usuário." });

      return res.status(200).json({ msg: "Usuário atualizado." });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ msg: "Erro ao atualizar usuário." });
    }
  }

  // PATCH /users/:id/toggle-ativo
  async toggleAtivo(req, res) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ msg: "Id inválido." });

      const ok = await this.#repo.toggleAtivo(id);
      if (!ok) return res.status(404).json({ msg: "Usuário não encontrado." });

      return res.status(200).json({ msg: "Status alterado." });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ msg: "Erro ao alterar status do usuário." });
    }
  }
}