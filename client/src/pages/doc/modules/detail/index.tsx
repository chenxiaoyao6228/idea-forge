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

  if (isHomeDoc) return <DocHome />;
  if (isMyDoc) return <MyDoc />;
  if (isShareDoc) return <ShareDoc />;

  return null;
}
