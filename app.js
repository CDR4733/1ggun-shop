import express from "express";
import cookieParser from "cookie-parser";
import dotEnv from "dotenv";
// import LogMiddleware from './src/middlewares/log.middleware.js'; // LogMiddlewaqre 완성되면 주석 풀기!!
import { prisma } from "./src/utils/prisma.util.js";

import UsersRouter from "./src/routes/users.router.js";
import ResumesRouter from "./src/routes/resumes.router.js";
import errorHandlerMiddleware from "./src/middlewares/error-handler.middleware.js";

dotEnv.config();

const app = express();
const PORT = process.env.PORT_NUM;

// app.use(LogMiddleware); // LogMiddlewaqre 완성되면 주석 풀기!! 맨 위에 위치할 것!

app.use(express.json());
app.use(cookieParser());

app.use("/api", [UsersRouter, ResumesRouter]);
app.use(errorHandlerMiddleware); // errorHandlerMiddleware는 마지막에 위치할 것!

prisma.$connect();
app.listen(PORT, () => {
  console.log(PORT, "포트로 서버가 열렸어요!");
});
