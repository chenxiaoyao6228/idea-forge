import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useDocumentStore } from "./doc/store";

export default function Home() {
  const navigate = useNavigate();
  const lastDocId = useDocumentStore.use.lastDocId();

  useEffect(() => {
    if (lastDocId) {
      navigate(`/doc/${lastDocId}`);
    } else {
      navigate("/doc/0");
    }
  }, []);

  return null;
}
