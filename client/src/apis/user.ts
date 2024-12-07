import request from "@/lib/request";

export const getUserInfo = () => request.get("/api/auth/userInfo");
