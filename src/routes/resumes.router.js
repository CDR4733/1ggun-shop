import express from "express";
import Joi from "joi";
import queryString from "query-string";
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
  // 6. 이력서 생성 결과를 클라이언트에 반환
  // 반환 내용 : resumeId, userId, resumeTitle, resumeContent, status, createdAt, updatedAt
  return res.status(201).json({
    status: 201,
    message: "이력서 생성이 완료되었습니다.",
    data: resume,
  });
});

/** 이력서 목록 조회 API **/
router.get("/resumes", authorizationMiddleware, async (req, res, next) => {
  // 1. authorizationMiddleware 사용자 인증 => req.user 받기
  // + 쿼리스트링 사용을 위해 미리 정렬조건도 받기
  const { userId } = req.user;
  // const urlSearch = new URLSearchParams(window.location.search);
  // const sortLike = urlSearch.get("sort").toString();
  // let sortType = "desc";
  // if (!sortLike) {
  //   sortType = "desc";
  // } else if (sortLike.toLowerCase() == "asc") {
  //   sortType = "asc";
  // } else {
  //   sortType = "desc";
  // } // 쿼리스트링 구현하려다가 실패했는데 시간이 없어서 일단 넘어감

  // 2. 현재 로그인 한 사용자의 이력서 목록만 조회함(DB 조회시 작성자 ID가 일치해야)
  // + 작성자 ID가 아닌 작성자 이름을 반환하기 위해 스키마에 정의한 Relation을 활용해 조회함
  const resumes = await prisma.resumes.findMany({
    select: {
      resumeId: true,
      User: {
        // 스키마에 정의한 Relation을 활용해 조회
        select: {
          UserInfos: {
            select: {
              name: true, // 작성자id 대신 이름을 조회
            },
            where: {
              UserId: +userId,
            },
          },
        },
      },
      resumeTitle: true,
      resumeContent: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    where: {
      UserId: +userId,
    },
    orderBy: {
      createdAt: "desc", // 일단 기본값은 최신순(desc)으로
    },
  });
  // 추가구현 필요사항
  // 0. Query Parameters(req.query)로 정렬 조건 받음 '?sort=asc'
  // + 생성일시 기준 정렬은 과거순(ASC), 최신순(DESC)으로 전달 받음.
  // + 대소문자 구분 없이 동작해야함
  // + 정렬 조건에 따라 다른 결과값을 조회함
  // 3. 조회결과가 없는 경우 - 빈 배열([ ])을 반환 (StatusCode: 200)
  if (!resumes) {
    return res.status(200).json({
      status: 200,
      message: "[ ]",
    });
  }
  // 4. 이력서 목록 조회 결과를 클라이언트에 반환
  // 반환 내용 : resumeId, name, resumeTitle, resumeContent, status, createdAt, updatedAt
  return res.status(200).json({
    status: 200,
    message: "이력서 목록 조회가 완료되었습니다.",
    data: resumes,
  });
});

export default router;
