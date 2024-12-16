import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/doc");
  }, []);

  return <div>Marketing Page</div>;
}
