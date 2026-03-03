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
      erro: {
        type: "object",
        properties: {
          message: { type: "string", example: "Mensagem de erro" },
        },
      },
      user: {
        type: "object",
        properties: {
          id: { type: "number", example: 1 },
          nome: { type: "string", example: "Ana Gerente" },
          email: { type: "string", example: "ana@salarosa.com" },
          perfil: { type: "string", example: "gerente" },
          isConsultora: { type: "boolean", example: false },
          ativo: { type: "boolean", example: true },
        },
      },
    },
  },
};

const routes = ["./server.js"];
const outputJson = "./swaggerOutput.json";

swaggerAutogen({ openapi: "3.0.0" })(outputJson, routes, doc).then(async () => {
  // Igual seu exemplo: depois de gerar o JSON, sobe o server
  await import("./server.js");
});