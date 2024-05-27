import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  // Prisma로 DB접근 시 SQL을 출력
  log: ["query", "info", "warn", "error"],

  // 에러 메시지 읽기 쉬운 형태로 출력
  errorFormat: "pretty",
}); // PrismaClient 인스턴스를 생성합니다.

try {
  await prisma.$connect();
  console.log("DB 연결에 성공했습니다.");
} catch (error) {
  console.error("DB 연결에 실패했습니다.", error);
}
