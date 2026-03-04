import ProdutosRepository from "../repositories/produtosRepository.js";
import Produto from "../entities/Produto.js";

export default class ProdutosController {

    #repo;

    constructor() {
        this.#repo = new ProdutosRepository();
    }

    async listar(req, res) {
        try {

            let lista = await this.#repo.listar();

            if(lista.length == 0)
                return res.status(404).json({ msg: "Nenhum produto encontrado." });

            return res.status(200).json(lista);

        } catch(e) {
            console.error(e);
            return res.status(500).json({ msg: "Erro ao listar produtos." });
        }
    }

    async obter(req, res) {
        try {

            let id = req.params.id;

            let produto = await this.#repo.obterPorId(id);

            if(!produto)
                return res.status(404).json({ msg: "Produto não encontrado." });

            return res.status(200).json(produto);

        } catch(e) {
            console.error(e);
            return res.status(500).json({ msg: "Erro ao obter produto." });
        }
    }

    async cadastrar(req, res) {
        try {

            let { nome, precoVenda } = req.body;

            if(!nome)
                return res.status(400).json({ msg: "Nome obrigatório." });

            let p = new Produto();
            p.nome = nome;
            p.precoVenda = precoVenda;

            let ok = await this.#repo.criar(p);

            if(!ok)
                return res.status(400).json({ msg: "Não foi possível cadastrar." });

            return res.status(201).json({ msg: "Produto cadastrado." });

        } catch(e) {
            console.error(e);
            return res.status(500).json({ msg: "Erro ao cadastrar produto." });
        }
    }

    async atualizar(req, res) {
        try {

            let id = req.params.id;

            let produto = await this.#repo.obterPorId(id);

            if(!produto)
                return res.status(404).json({ msg: "Produto não encontrado." });

            produto.nome = req.body.nome ?? produto.nome;
            produto.precoVenda = req.body.precoVenda ?? produto.precoVenda;

            let ok = await this.#repo.atualizar(produto);

            if(!ok)
                return res.status(400).json({ msg: "Não foi possível atualizar." });

            return res.status(200).json({ msg: "Produto atualizado." });

        } catch(e) {
            console.error(e);
            return res.status(500).json({ msg: "Erro ao atualizar produto." });
        }
    }

    async excluir(req, res) {
        try {

            let id = req.params.id;

            let ok = await this.#repo.excluir(id);

            if(!ok)
                return res.status(400).json({ msg: "Não foi possível excluir." });

            return res.status(200).json({ msg: "Produto excluído." });

        } catch(e) {
            console.error(e);
            return res.status(500).json({ msg: "Erro ao excluir produto." });
        }
    }

}