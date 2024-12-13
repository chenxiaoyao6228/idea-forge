import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getEnvVariable } from "@/lib/env";
import request from "@/lib/request";
import { SHARE_NAME } from "shared";
export default function Home() {
  const clientAppUrl = getEnvVariable("CLIENT_APP_URL");
  const navigate = useNavigate();

  const handleGetUserInfo = async () => {
    try {
      const userInfo = await request.get("/api/auth/userInfo");
      console.log("userInfo:", userInfo);
    } catch (err) {
      console.error("Failed to get user info:", err);
    }
  };

  const handleLogout = async () => {
    await request.post("/api/auth/logout");
    navigate("/login");
  };

  return (
    <div>
      <div>Home</div>
      <div>Client App Url: {clientAppUrl}</div>
      <div>Shared Name: {SHARE_NAME}</div>
      <Button onClick={handleGetUserInfo}>Get User Info</Button>
      <Button onClick={handleLogout}>Logout</Button>
    </div>
  );
}
