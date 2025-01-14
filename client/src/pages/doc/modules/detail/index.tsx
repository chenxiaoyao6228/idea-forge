import { useParams } from "react-router-dom";
import DocHome from "./home";
import Loading from "@/components/loading";
import { useDocumentStore } from "../../stores/doc-store";
import { Toolbar } from "./toolbar";
import Cover from "./cover";
import TiptapEditor from "../editor";
import useUserStore from "@/stores/user";

export default function DocDetail() {
  const { docId } = useParams();
  const userId = useUserStore((s) => s.userInfo?.id);
  const currentDocument = useDocumentStore.use.currentDocument();
  const isCurrentDocLoading = useDocumentStore.use.isCurrentDocLoading();
  const currentDocLoadingError = useDocumentStore.use.currentDocLoadingError();
  const isHomeDoc = docId === "0";

  if (isCurrentDocLoading) {
    return <Loading />;
  }

  if (currentDocLoadingError) {
    return <div className="flex-auto overflow-y-auto flex justify-center items-center h-full">{currentDocLoadingError}</div>;
  }

  if (isHomeDoc) {
    return <DocHome />;
  }

  if (!currentDocument) {
    return null;
  }

  const permission = currentDocument.permission;
  const hasNoPermission = permission === "NONE";
  const hasEditPermission = permission === "EDIT";

  if (hasNoPermission) {
    return <div>You have no permission to view this document</div>;
  }

  const isMyDoc = currentDocument.ownerId === userId;

  return (
    <div className="flex-auto overflow-y-auto">
      <div className="pb-40">
        {/* TODO: use yjs-zustand to allow multiple user edit  title , cover and icon */}
        {currentDocument?.coverImage && <Cover cover={currentDocument.coverImage} editable={isMyDoc} />}
        <div className="md:max-w-3xl lg:max-w-4xl mx-auto px-10">
          <Toolbar doc={currentDocument} editable={isMyDoc} />
          <TiptapEditor id={currentDocument.id} editable={hasEditPermission} />
        </div>
      </div>
    </div>
  );
}
