import express from "express";
import Joi from "joi";
import bcrypt from "bcrypt";
import { prisma } from "../utils/prisma.util.js";

const router = express.Router();

/** 회원 가입 API **/
router.post("/sign-up", async (req, res, next) => {
  // 1. email, password, passwordConfirm, name => req.body
  const { email, password, passwordConfirm, name } = req.body;
  // 2. 회원 정보 중 하나라도 빠진 경우 - 400 "~을(를) 입력하지 않았습니다."
  if (!email) {
    return res
      .status(400)
      .json({ message: "이메일을 입력하지 않았습니다. 다시 확인해주세요!" });
  }
  if (!password) {
    return res
      .status(400)
      .json({ message: "비밀번호를 입력하지 않았습니다. 다시 확인해주세요!" });
  }
  if (!passwordConfirm) {
    return res.status(400).json({
      message: "비밀번호확인을 입력하지 않았습니다. 다시 확인해주세요!",
    });
  }
  if (!name) {
    return res
      .status(400)
      .json({ message: "이름을 입력하지 않았습니다. 다시 확인해주세요!" });
  }
  // 3. 이메일 형식에 맞지 않는 경우 - 400 "이메일 형식이 올바르지 않습니다."
  if (email.includes("@") && email.includes(".")) {
  } else {
    return res
      .status(400)
      .json({ message: "이메일 형식이 올바르지 않습니다." });
  }
  // 4. 이메일이 중복되는 경우 - 409 "이미 가입이 완료된 이메일 입니다."
  const isExistEmail = await prisma.users.findFirst({
    where: { email },
  });
  if (isExistEmail) {
    return res
      .status(409)
      .json({ message: "이미 가입이 완료된 이메일 입니다." });
  }
  // 5. 비밀번호가 6자리 미만인 경우 - "비밀번호는 6자리 이상이어야 합니다."
  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "비밀번호는 6자리 이상이어야 합니다." });
  }
  // 6. 비밀번호와 비밀번호 확인이 일치하지 않는 경우 - "입력한 두 비밀번호가 일치하지 않습니다."
  if (password !== passwordConfirm) {
    return res
      .status(400)
      .json({ message: "입력한 두 비밀번호가 일치하지 않습니다." });
  }
  // 7. 비밀번호는 hashing해서 저장
  const hashedPassword = await bcrypt.hash(password, 10);
  // 8. 사용자 ID, 역할, 생성일시, 수정일시는 자동 생성
  const user = await prisma.users.create({
    data: {
      email,
      password: hashedPassword,
    },
  });
  // 9. user 데이터를 바탕으로 userInfo 데이터 생성
  // role 기본 값은 APPLICANT (<-> RECRUITER) : 스키마 수정
  const userInfo = await prisma.userInfos.create({
    data: {
      UserId: user.userId,
      email,
      name,
    },
  });
  // 10. 회원 가입 결과를 클라이언트에 반환 201
  // (userId, email, name, role, createdAt, updatedAt 반환)
  return res.status(201).json({
    status: 201,
    message: "회원 가입이 완료되었습니다.",
    data: userInfo,
  });
});

export default router;
