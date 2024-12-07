import { getUserInfo } from "@/apis/user";
import { Button } from "@/components/ui/button";
export default function Home() {
  const handleGetUserInfo = async () => {
    try {
      const userInfo = await getUserInfo();
      console.log('userInfo:', userInfo);
    } catch (err) {
      console.error('Failed to get user info:', err);
    }
  };

  return (
    <div>
      <div>Home</div>
      <Button onClick={handleGetUserInfo}>Get User Info</Button>
    </div>
  );
}
