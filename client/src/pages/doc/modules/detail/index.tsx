import { useDocumentStore } from "../../store";
import DocHome from "./home";
import ShareDoc from "./share-doc";
import MyDoc from "./my-doc";
import { useParams } from "react-router-dom";
import { treeUtils } from "../../util";

export default function DocDetail() {
  const { docId } = useParams();
  const treeData = useDocumentStore.use.treeData();
  const isMyDoc = docId ? treeUtils.findNode(treeData, docId) : null;
  const isHomeDoc = docId === "0";
  const isShareDoc = !isMyDoc && !isHomeDoc;

  if (isHomeDoc) return <DocHome />;
  if (isMyDoc) return <MyDoc />;
  if (isShareDoc) return <ShareDoc />;

  return null;
}
