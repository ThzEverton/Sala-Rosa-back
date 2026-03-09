import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerFile from "./swaggerOutput.json" with { type: "json" };
//import swaggerFile from './swaggerOutput.json' assert { type: 'json' };
import swaggerUi from "swagger-ui-express";



import authRoutes from "./routes/authRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";
import servicosRoutes from "./routes/servicosRoutes.js";
import produtosRoutes from "./routes/produtosRoutes.js";
import agendaRoutes from "./routes/agendaRoutes.js";
import agendamentosRoutes from "./routes/agendamentosRoutes.js";
import turmasRoutes from "./routes/turmasRoutes.js";
import vendasRoutes from "./routes/vendasRoutes.js";
import estoqueRoutes from "./routes/estoqueRoutes.js";
import financeiroRoutes from "./routes/financeiroRoutes.js";

//import { errorHandler } from "./middlewares/errorHandler.js";
const app = express();

// ✅ CORS correto (dev)
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5000"],
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Swagger
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));

// Health
app.get("/health", (req, res) => res.json({ ok: true, api: "Sala Rosa" }));

// Rotas
app.use("/autenticacao", authRoutes);
app.use("/users", usersRoutes);
app.use("/servicos", servicosRoutes);
app.use("/produtos", produtosRoutes);
app.use("/agenda", agendaRoutes);
app.use("/agendamentos", agendamentosRoutes);
app.use("/turmas", turmasRoutes);
app.use("/vendas", vendasRoutes);
app.use("/estoque", estoqueRoutes);
app.use("/financeiro", financeiroRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`backend em execução em http://localhost:${PORT}`));