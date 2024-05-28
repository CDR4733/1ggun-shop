import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma.util.js";

export default async function (req, res, next) {
  try {
    // 1. 클라이언트로부터 쿠키를 전달 받음
    const { authorization } = req.cookies;
    // 2. Authorization 또는 AccessToken 확인
    // 없는 경우 - "인증 정보가 없습니다."
    if (!authorization) {
      return res.status(401).json({
        status: 401,
        message: "인증 정보가 없습니다.",
      });
    }
    // 3. 쿠키가 JWT 표준 인증 형태(Bearer 토큰 형식)인지 확인
    //    - "지원하지 않는 인증 방식입니다."
    const [tokenType, token] = authorization.split(" ");
    if (tokenType !== "Bearer") {
      return res.status(401).json({
        status: 401,
        message: "지원하지 않는 인증 방식입니다.",
      });
    }
    // 4. 서버에서 발급한 JWT가 맞는지 검증
    // 아닌 경우 - 에러 - "인증 정보가 유효하지 않습니다."
    const decodedToken = jwt.verify(token, "customized_secret_key"); // .env 리팩토링하기!!
    const userId = decodedToken.userId;
    // 5. Payload에 담긴 사용자 ID와 일치하는 사용자 조회
    // 없는 경우 - "인증 정보와 일치하는 사용자가 없습니다."
    const user = await prisma.users.findFirst({
      where: { userId: +userId },
    });
    if (!user) {
      res.clearCookie("Authorization"); // 잘못된 쿠키니까 삭제
      return res.status(404).json({
        status: 404,
        message: "인증 정보와 일치하는 사용자가 없습니다.",
      });
    }
    // 9. req.user에 조회된 사용자 정보를 할당
    req.user = user;
    // 10. 다음 미들웨어 실행
    next();
  } catch (error) {
    // 공통. 오류를 일으키는 해당 쿠키 삭제
    res.clearCookie("Authorization");
    // 오류 별 분기
    switch (error.name) {
      // 6.AccessToken의 유효기한이 지난 경우 - "인증 정보가 만료되었습니다."
      case "TokenExpiredError":
        return res.status(401).json({
          status: 401,
          message: "인증 정보가 만료되었습니다.",
        });
      // 7. 토큰 검증이 실패하였을 때 - "지원하지 않는 인증 방식입니다."
      case "JsonWebTokenError":
        return res.status(401).json({
          status: 401,
          message: "지원하지 않는 인증 방식입니다.",
        });
      // 8. 그 외 모든 상황의 에러에 대해 - "인증 정보가 유효하지 않습니다."
      default:
        return res.status(401).json({
          status: 401,
          message: error.message ?? "비정상적인 인증 요청입니다.",
        });
    }
  }
}
