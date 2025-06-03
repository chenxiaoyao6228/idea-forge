import { useParams } from "react-router-dom";
import DocHome from "./home";
import Loading from "@/components/ui/loading";
import { useDocumentStore } from "../../stores/doc-store";
import { Toolbar } from "./toolbar";
import Cover from "./cover";
import TiptapEditor from "../../editor";
import useUserStore from "@/stores/user-store";
import { getEnvVariable } from "@/lib/env";
import { TableOfContent } from "./components/table-of-content";
import { useTranslation } from "react-i18next";
import { useTitle } from "react-use";
import DocumentHeader from "./components/doc-header";
import BackToTop from "@/components/ui/back-to-top";

export default function Doc() {
  const { t } = useTranslation();
  const { docId } = useParams();
  const userId = useUserStore((s) => s.userInfo?.id);
  const collabToken = useUserStore((s) => s.userInfo?.collabToken);
  const currentDocument = useDocumentStore.use.currentDocument();
  const isCurrentDocLoading = useDocumentStore.use.isCurrentDocLoading();
  const currentDocLoadingError = useDocumentStore.use.currentDocLoadingError();

  const isHomeDoc = docId === "0";

  useTitle(`Idea Forge - ${currentDocument?.title}`);

  if (isCurrentDocLoading) {
    return <Loading fullScreen size="lg" />;
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

  if (!collabToken) {
    return null;
  }

  const permission = currentDocument.permission;
  const hasNoPermission = permission === "NONE";
  const hasEditPermission = permission === "EDIT";

  if (hasNoPermission) {
    return <div>{t("You have no permission to view this document")}</div>;
  }

  const isMyDoc = currentDocument.ownerId === userId;

  return (
    <>
      <DocumentHeader />
      <div className="flex-auto overflow-y-auto">
        {/* TODO: use yjs-zustand to allow multiple user edit  title , cover and icon */}
        {currentDocument?.coverImage && <Cover cover={currentDocument.coverImage} editable={isMyDoc} />}
        <div className="md:max-w-3xl lg:max-w-4xl mx-auto px-10 relative">
          {/* FIXME: rollback */}
          {/* <Toolbar doc={currentDocument} editable={isMyDoc} /> */}
          {/* <TiptapEditor id={currentDocument.id} editable={hasEditPermission} collabToken={collabToken} collabWsUrl={getEnvVariable("CLIENT_COLLAB_WS_URL")} /> */}
          {/* <TableOfContent /> */}
        </div>
      </div>
      <BackToTop />
    </>
  );
}
