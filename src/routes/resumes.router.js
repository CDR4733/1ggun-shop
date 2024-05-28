import express from "express";
import Joi from "joi";
import { prisma } from "../utils/prisma.util.js";
import errorHandlerMiddleware from "../middlewares/error-handler.middleware.js";
import authorizationMiddleware from "../middlewares/authorization.middleware.js";

const router = express.Router();

/** 이력서 생성 API **/
router.post("/resumes", authorizationMiddleware, async (req, res, next) => {
  // 1. authorizationMiddleware 사용자 인증 => req.user 받기
  // + 이력서 작성을 위한 resumeTitle, resumeContent를 req.body로 전달 받기
  const { resumeTitle, resumeContent } = req.body;
  // 2. resumeTitle, resumeContent가 모두 입력됐는지 확인
  if (!resumeTitle) {
    return res.status(400).json({
      status: 400,
      message: "이력서 제목을 입력하지 않았습니다. 다시 확인해주세요!",
    });
  }
  if (!resumeContent) {
    return res.status(400).json({
      status: 400,
      message: "이력서 내용을 입력하지 않았습니다. 다시 확인해주세요!",
    });
  }
  // 3. resumeContent 가 150자 이상 적혔는지 확인
  // 그렇지 않으면 - "자기소개는 150자 이상 작성해야합니다."
  if (resumeContent.length < 150) {
    return res.status(400).json({
      status: 400,
      message: "자기소개는 150자 이상 작성해야합니다.",
    });
  }
  // 4. 작성자 userId는 인증 Middleware에서 전달받은 정보를 활용
  const { userId } = req.user;
  // 5. Resumes 테이블에 이력서 생성
  // + resumeId, status(기본값APPLY), createdAt, updatedAt은 자동생성
  // + status : APPLY, DROP, PASS, INTERVIEW1, INTERVIEW2, FINAL_PASS
  const resume = await prisma.resumes.create({
    data: {
      UserId: +userId,
      resumeTitle,
      resumeContent,
    },
  });
  // 0. 이력서 생성 결과를 클라이언트에 반환
  // 반환 내용 : resumeId, userId, resumeTitle, resumeContent, status, createdAt, updatedAt
  return res.status(201).json({
    status: 201,
    message: "이력서 생성이 완료되었습니다.",
    data: resume,
  });
});

export default router;
