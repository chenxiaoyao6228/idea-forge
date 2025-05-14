import { useNavigate, useSearchParams } from "react-router-dom";
import { documentApi } from "@/apis/document";
import { useDocumentStore } from "@/stores/doc-store";
import useUserStore from "@/stores/user-store";
import { useEffect, useState } from "react";

// TODO: add check from localstorage
export function usePrepareDoc() {
  const userInfo = useUserStore((state) => state.userInfo);
  const lastDocId = useDocumentStore((state) => state.lastDocId);
  const setLastDocId = useDocumentStore((state) => state.setLastDocId);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchLastDoc() {
      if (!userInfo || lastDocId) return;

      setIsLoading(true);
      try {
        const { id } = await documentApi.getLatestDocument();
        setLastDocId(id);
        navigate(`/${id}`);
      } catch (error) {
        console.error("Failed to fetch last document:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLastDoc();
  }, [userInfo, lastDocId]);

  return {
    isLoading,
  };
}
