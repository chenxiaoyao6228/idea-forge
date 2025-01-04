import { useDocumentStore } from "../../store";
import DocHome from "./home";
import ShareDoc from "./share-doc";
import MyDoc from "./my-doc";
import { treeUtils } from "../../util";

interface Props {
  curDocId?: string;
}

export default function DocDetail({ curDocId }: Props) {
  const treeData = useDocumentStore.use.treeData();
  const isMyDoc = curDocId ? treeUtils.findNode(treeData, curDocId) : null;
  const isHomeDoc = curDocId === "0";
  const isShareDoc = !isMyDoc && !isHomeDoc;

  if (isHomeDoc) return <DocHome />;
  if (isMyDoc) return <MyDoc />;
  if (isShareDoc) return <ShareDoc />;

  return null;
}
