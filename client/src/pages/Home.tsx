import { getUserInfo } from "@/apis/user";
import { Button } from "@/components/ui/button";
import { getEnvVariable } from "@/lib/env";
import { SHARE_NAME } from "shared";

export default function Home() {
  const clientAppUrl = getEnvVariable("CLIENT_APP_URL");
  const handleGetUserInfo = async () => {
    try {
      const userInfo = await getUserInfo();
      console.log("userInfo:", userInfo);
    } catch (err) {
      console.error("Failed to get user info:", err);
    }
  };

  return (
    <div>
      <div>Home</div>
      <div>Client App Url: {clientAppUrl}</div>
      <div>Shared Name: {SHARE_NAME}</div>
      <Button onClick={handleGetUserInfo}>Get User Info</Button>
    </div>
  );
}
