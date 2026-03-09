import ServicosRepository from "../repositories/servicosRepository.js";
import Servico from "../entities/Servico.js";

export default class ServicosController {
  #repo;

  constructor() {
    this.#repo = new ServicosRepository();
  }

  // GET /servicos
  async listar(req, res) {
    try {
      const lista = await this.#repo.listar();
      if (!lista || lista.length === 0) {
        return res.status(404).json({ msg: "Nenhum serviço encontrado." });
      }
      return res.status(200).json(lista);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ msg: "Erro ao listar serviços." });
    }
  }

  // GET /servicos/visiveis?isConsultora=0|1
  async listarVisiveis(req, res) {
    try {
      const isConsultora = req.query.isConsultora == "1";
      const lista = await this.#repo.listarVisiveis(isConsultora);

      if (!lista || lista.length === 0) {
        return res.status(404).json({ msg: "Nenhum serviço encontrado." });
      }

      return res.status(200).json(lista);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ msg: "Erro ao listar serviços visíveis." });
    }
  }

  // POST /servicos
  async cadastrar(req, res) {
    try {
      const { nome, descricao, preco, duracaoMin, ativo, exclusivoParaConsultora } = req.body;

      if (!nome || nome.trim().length < 2) {
        return res.status(400).json({ msg: "Nome inválido." });
      }

      const p = Number(preco);
      if (isNaN(p) || p < 0) {
        return res.status(400).json({ msg: "Preço inválido." });
      }

      const d = Number(duracaoMin);
      if (isNaN(d) || d <= 0) {
        return res.status(400).json({ msg: "Duração inválida." });
      }

      let s = new Servico();
      s.nome = nome.trim();
      s.descricao = descricao || null;
      s.preco = p;
      s.duracaoMin = d;
      s.ativo = ativo === undefined ? 1 : Number(ativo) ? 1 : 0;
      s.exclusivoParaConsultora = exclusivoParaConsultora === undefined ? 0 : Number(exclusivoParaConsultora) ? 1 : 0;

      const result = await this.#repo.criar(s);

      if (!result) {
        return res.status(400).json({ msg: "Não foi possível cadastrar serviço." });
      }

      return res.status(201).json({
        msg: "Serviço cadastrado.",
        id: result.insertId
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ msg: "Erro ao cadastrar serviço." });
    }
  }

  // PUT /servicos/:id
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const { nome, descricao, preco, duracaoMin, ativo, exclusivoParaConsultora } = req.body;

      if (!id) {
        return res.status(400).json({ msg: "Id inválido." });
      }

      const atual = await this.#repo.obterPorId(id);
      if (!atual) {
        return res.status(404).json({ msg: "Serviço não encontrado." });
      }

      if (nome !== undefined) {
        if (!String(nome).trim() || String(nome).trim().length < 2) {
          return res.status(400).json({ msg: "Nome inválido." });
        }
        atual.nome = String(nome).trim();
      }

      if (descricao !== undefined) {
        atual.descricao = descricao;
      }

      if (preco !== undefined) {
        const p = Number(preco);
        if (isNaN(p) || p < 0) {
          return res.status(400).json({ msg: "Preço inválido." });
        }
        atual.preco = p;
      }

      if (duracaoMin !== undefined) {
        const d = Number(duracaoMin);
        if (isNaN(d) || d <= 0) {
          return res.status(400).json({ msg: "Duração inválida." });
        }
        atual.duracaoMin = d;
      }

      if (ativo !== undefined) {
        atual.ativo = Number(ativo) ? 1 : 0;
      }

      if (exclusivoParaConsultora !== undefined) {
        atual.exclusivoParaConsultora = Number(exclusivoParaConsultora) ? 1 : 0;
      }

      const ok = await this.#repo.atualizar(atual);
      if (!ok) {
        return res.status(400).json({ msg: "Não foi possível atualizar serviço." });
      }

      return res.status(200).json({ msg: "Serviço atualizado." });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ msg: "Erro ao atualizar serviço." });
    }
  }
}