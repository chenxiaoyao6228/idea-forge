import { useParams } from "react-router-dom";
import DocHome from "./home";
import ShareDoc from "./share-doc";
import MyDoc from "./my-doc";
import Loading from "@/components/loading";
import { useDocumentStore } from "../../stores/store";

export default function DocDetail() {
  const { docId } = useParams();
  const currentDocument = useDocumentStore.use.currentDocument();
  const isCurrentDocLoading = useDocumentStore.use.isCurrentDocLoading();
  const isHomeDoc = docId === "0";

  // FIXME: this is not a good way to check if it is a shared doc
  // doc might not exist in the store
  const isShareDoc = !currentDocument && !isHomeDoc;

  if (isCurrentDocLoading) {
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
