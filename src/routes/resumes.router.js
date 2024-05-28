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
  const { sort } = req.query;

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
      createdAt: sort ? sort.toLowerCase() : "desc", // 기본값은 최신순(desc)
    },
  });

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

/** 이력서 상세 조회 API **/
router.get(
  "/resumes/:resumeId",
  authorizationMiddleware,
  async (req, res, next) => {
    // 1. 사용자 정보는 인증 Middleware(req.user)를 통해 전달 받음
    const { userId } = req.user;
    // 2. 이력서 ID를 Path Parameters(req.params)로 전달 받음
    const { resumeId } = req.params;
    // 3. 현재 로그인 한 사용자가 작성한 이력서만 조회함
    // + DB에서 이력서 조회 시 이력서 ID, 작성자 ID가 모두 일치해야 함
    // + userId가 아닌 name 반환을 위해 스키마에 정의한 Relation을 활용
    const resume = await prisma.resumes.findFirst({
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
        resumeId: +resumeId,
      },
    });

    // 4. 이력서 정보가 없는 경우 - "내가 쓴 이력서가 아니거나, 이력서가 존재하지 않습니다."
    if (!resume) {
      return res.status(404).json({
        status: 404,
        message: "내가 쓴 이력서가 아니거나, 이력서가 존재하지 않습니다.",
      });
    }
    // 0. 이력서 상세 조회 결과를 클라이언트에 반환
    // 내용 : resumeId, name, resumeTitle, resumeContent, status, createdAt, updatedAt
    return res.status(200).json({
      status: 200,
      message: "이력서 상세 조회가 완료되었습니다.",
      data: resume,
    });
  },
);

/** 이력서 수정 API **/
router.patch(
  "/resumes/:resumeId",
  authorizationMiddleware,
  async (req, res, next) => {
    // 1. 사용자 정보는 인증 Middleware(req.user)를 통해서 전달 받음
    const { userId } = req.user;
    // 2. 이력서 ID를 Path Parameters(req.params)로 전달 받음
    const { resumeId } = req.params;
    // 3. 수정할 내용을 req.body에 받음
    const { resumeTitle, resumeContent } = req.body;
    // 4. 수정할 내용을 빼먹지 않았는지 확인
    if (!resumeTitle && !resumeContent) {
      return res.status(400).json({
        status: 400,
        message: "수정할 정보를 입력해주세요.",
      });
    }
    // 5. 수정하기로 선택한 이력서와 관련하여
    // 로그인한 userId와 이력서를 쓴 사람의 UserId가 일치하는지 확인
    const resume = await prisma.resumes.findFirst({
      where: {
        UserId: +userId,
        resumeId: +resumeId,
      },
    });
    // 6. 이력서가 존재하는지 확인
    if (!resume) {
      return res.status(404).json({
        status: 404,
        message: "내가 쓴 이력서가 아니거나, 이력서가 존재하지 않습니다.",
      });
    }
    // 7. 이력서 수정하기
    await prisma.resumes.update({
      data: {
        resumeTitle,
        resumeContent,
        updatedAt: new Date(),
      },
      where: {
        UserId: +userId,
        resumeId: +resumeId,
      },
    });
    // 8. 이력서 수정 결과를 클라이언트에게 반환
    // resumeId, userId, resumeTitle, resumeContent, status, createdAt, updatedAt
    return res.status(200).json({
      status: 200,
      message: "이력서 수정이 완료되었습니다.",
      data: {
        resumeId,
        userId,
        resumeTitle: resumeTitle ? resumeTitle : resume.resumeTitle,
        resumeContent: resumeContent ? resumeContent : resume.resumeContent,
        status: resume.status,
        createdAt: resume.createdAt,
        updatedAt: new Date(),
      },
    });
  },
);

/** 이력서 삭제 API **/
router.delete(
  "/resumes/:resumeId",
  authorizationMiddleware,
  async (req, res, next) => {
    // 1. 사용자 정보는 인증 Middleware(req.user)를 통해서 전달 받음
    const { userId } = req.user;
    // 2. 이력서 ID를 Path Parameters(req.params)로 전달 받음
    const { resumeId } = req.params;
    // 3. 삭제하기로 선택한 이력서와 관련하여
    // 로그인한 userId와 이력서를 쓴 사람의 UserId가 일치하는지 확인
    const resume = await prisma.resumes.findFirst({
      where: {
        UserId: +userId,
        resumeId: +resumeId,
      },
    });
    // 4. 이력서 정보가 없는 경우 - "내가 쓴 이력서가 아니거나, 이력서가 존재하지 않습니다."
    if (!resume) {
      return res.status(404).json({
        status: 404,
        message: "내가 쓴 이력서가 아니거나, 이력서가 존재하지 않습니다.",
      });
    }
    // 5. DB에서 이력서 정보를 삭제함
    await prisma.resumes.delete({
      where: {
        UserId: +userId,
        resumeId: +resumeId,
      },
    });
    // 6. 삭제된 이력서 ID를 클라이언트에게 반환함
    return res.status(200).json({
      status: 200,
      message: "이력서 삭제가 완료되었습니다.",
      data: {
        resumeId,
      },
    });
  },
);

export default router;
