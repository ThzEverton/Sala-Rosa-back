import "dotenv/config";
import swaggerAutogen from "swagger-autogen";

const doc = {
  openapi: "3.0.0",
  info: {
    title: "Sala Rosa API",
    description: "API do sistema Sala Rosa",
    version: "1.0.0",
  },
  servers: [
    {
      url: `http://localhost:${process.env.PORT || 3000}/`,
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
      },
    },
    schemas: {
      // ===== PADRÃO DE ERRO (bate com seus controllers: { msg: "..." })
      erro: {
        type: "object",
        properties: {
          msg: { type: "string", example: "Mensagem de erro" },
        },
      },

      // ===== USERS
      usuario: {
        type: "object",
        required: ["id", "nome", "email"],
        properties: {
          id: { type: "string", example: "u100" }, // no seu banco é VARCHAR(20)
          nome: { type: "string", example: "Ana Gerente" },
          email: { type: "string", example: "ana@salarosa.com" },
          telefone: { type: "string", example: "11999990001" },
          dataNascimento: { type: "string", example: "2000-01-01" },

          perfil: { type: "string", example: "gerente" }, // gerente|cliente
          isConsultora: { type: "integer", example: 0 },  // 0|1 (TINYINT)
          ativo: { type: "integer", example: 1 },         // 0|1
          senhaHash: { type: "string", example: null },
        },
      },

      usuarioUpdate: {
        type: "object",
        properties: {
          nome: { type: "string", example: "Maria Silva" },
          email: { type: "string", example: "maria@email.com" },
          telefone: { type: "string", example: "11999990002" },
          dataNascimento: { type: "string", example: "2000-01-01" },
          perfil: { type: "string", example: "cliente" },
          isConsultora: { type: "integer", example: 0 },
          ativo: { type: "integer", example: 1 },
        },
      },

      // ===== SERVIÇOS
      servico: {
        type: "object",
        required: ["id", "nome", "preco", "duracaoMin"],
        properties: {
          id: { type: "string", example: "s1" },
          nome: { type: "string", example: "Design de Sobrancelhas" },
          descricao: { type: "string", example: "Modelagem e design profissional." },
          preco: { type: "number", example: 80.0 },
          duracaoMin: { type: "integer", example: 60 },
          ativo: { type: "integer", example: 1 },                 // 0|1
          exclusivoParaConsultora: { type: "integer", example: 0 } // 0|1
        },
      },

      servicoUpdate: {
        type: "object",
        properties: {
          nome: { type: "string", example: "Novo nome" },
          descricao: { type: "string", example: "Nova descrição" },
          preco: { type: "number", example: 90.0 },
          duracaoMin: { type: "integer", example: 60 },
          ativo: { type: "integer", example: 1 },
          exclusivoParaConsultora: { type: "integer", example: 0 }
        },
      },

      // ===== PRODUTOS
      produto: {
        type: "object",
        required: ["id", "nome", "precoVenda"],
        properties: {
          id: { type: "string", example: "p1" },
          nome: { type: "string", example: "Creme Hidratante Facial" },
          unidade: { type: "string", example: "un" },
          precoVenda: { type: "number", example: 89.9 },
          estoqueAtual: { type: "integer", example: 10 },
          estoqueMinimo: { type: "integer", example: 2 },
          ativo: { type: "integer", example: 1 },
        },
      },

      produtoUpdate: {
        type: "object",
        properties: {
          nome: { type: "string", example: "Novo nome" },
          unidade: { type: "string", example: "un" },
          precoVenda: { type: "number", example: 99.9 },
          estoqueMinimo: { type: "integer", example: 3 },
          ativo: { type: "integer", example: 1 },
        },
      },

      // (Opcional) Mantive seu schema antigo como alias, se você já usa em algum lugar.
      // Se não usa, pode remover.
      user: {
        type: "object",
        properties: {
          id: { type: "string", example: "u1" },
          nome: { type: "string", example: "Ana Gerente" },
          email: { type: "string", example: "ana@salarosa.com" },
          perfil: { type: "string", example: "gerente" },
          isConsultora: { type: "integer", example: 0 },
          ativo: { type: "integer", example: 1 },
        },
      },
    },
  },
};

const routes = ["./server.js"];
const outputJson = "./swaggerOutput.json";

swaggerAutogen({ openapi: "3.0.0" })(outputJson, routes, doc).then(async () => {
  await import("./server.js");
});