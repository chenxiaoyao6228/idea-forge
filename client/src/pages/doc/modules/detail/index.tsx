import { useParams } from "react-router-dom";
import { useDocumentStore } from "../../stores/store";
import DocHome from "./home";
import ShareDoc from "./share-doc";
import MyDoc from "./my-doc";
import { treeUtils } from "../../util";

export default function DocDetail() {
  const { docId: curDocId } = useParams();
  const treeData = useDocumentStore.use.treeData();
  const isMyDoc = curDocId ? treeUtils.findNode(treeData, curDocId) : null;
  const isHomeDoc = curDocId === "0";
  const isShareDoc = !isMyDoc && !isHomeDoc;

  return (
    <div className="flex-auto overflow-y-auto">
      {isHomeDoc && <DocHome />}
      {isMyDoc && <MyDoc />}
      {isShareDoc && <ShareDoc />}
    </div>
  );
}
