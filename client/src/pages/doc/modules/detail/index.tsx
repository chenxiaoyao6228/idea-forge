import { useParams } from "react-router-dom";
import { useCurrentDocument } from "../../stores/store";
import DocHome from "./home";
import ShareDoc from "./share-doc";
import MyDoc from "./my-doc";
import Loading from "@/components/loading";

export default function DocDetail() {
  const { docId } = useParams();
  const { currentDocument, isLoading } = useCurrentDocument();
  const isHomeDoc = docId === "0";
  const isShareDoc = !currentDocument && !isHomeDoc;

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="flex-auto overflow-y-auto">
      {isHomeDoc && <DocHome />}
      {currentDocument && <MyDoc />}
      {isShareDoc && <ShareDoc />}
    </div>
  );
}
