import request from "@/lib/request";

export const login = (data: { email: string; password: string }) =>
  request.post("/api/auth/login", data);

export const getUserInfo = () => request.get("/api/auth/userInfo");
