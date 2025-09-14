import DocHome from "./home";
import Loading from "@/components/ui/loading";
import Cover from "./cover";
import useUserStore from "@/stores/user";
import { useTranslation } from "react-i18next";
import { useTitle } from "react-use";
import DocumentHeader from "./components/doc-header";
import BackToTop from "@/components/ui/back-to-top";
import { useCurrentDocument, useCurrentDocumentId } from "@/hooks/use-current-document";
import { getEnvVariable } from "@/lib/env";
import { Toolbar } from "./toolbar";
import TiptapEditor from "@/editor";
import { TableOfContent } from "./components/table-of-content";
import useDocumentStore from "@/stores/document";
import useUIStore from "@/stores/ui";

export default function Doc() {
  const { t } = useTranslation();
  const userId = useUserStore((s) => s.userInfo?.id);
  const activeDocumentId = useCurrentDocumentId();
  const collabToken = useUserStore((s) => s.userInfo?.collabToken);
  const currentDocument = useCurrentDocument();

  const isHomeDoc = false;

  // Type guard to ensure we have a proper document
  const isDocumentLoaded = currentDocument && !currentDocument.isLoading && "id" in currentDocument;

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  useTitle(`Idea Forge ${isDocumentLoaded && currentDocument?.title ? `- ${currentDocument.title}` : ""}`);

  console.log("currentDocument", currentDocument);

  // Move these up, use optional chaining to avoid errors
  const permission = isDocumentLoaded ? currentDocument?.permission : undefined;
  const hasNoPermission = permission === "NONE";
  const hasEditPermission = permission === "EDIT";
  const isMyDoc = isDocumentLoaded ? currentDocument?.createdById === userId : false;

  // Handle loading state
  if (currentDocument?.isLoading) {
    return <Loading />;
  }

  if (isHomeDoc) {
    return <DocHome />;
  }

  if (!activeDocumentId || !isDocumentLoaded || currentDocument?.id === null) {
    return null;
  }

  if (!collabToken) {
    return null;
  }

  if (hasNoPermission) {
    return <div>{t("You have no permission to view this document")}</div>;
  }

  return (
    <>
      <DocumentHeader />
      <div className="flex-auto overflow-y-auto">
        {currentDocument?.coverImage && <Cover cover={currentDocument.coverImage} editable={true} />}
        <div className="md:max-w-3xl lg:max-w-4xl mx-auto px-10 relative">
          <Toolbar doc={currentDocument} editable={true} />
          <TiptapEditor id={currentDocument.id!} editable={true} collabToken={collabToken} collabWsUrl={getEnvVariable("CLIENT_COLLAB_WS_URL")} />
          <TableOfContent />
        </div>
      </div>
      <BackToTop />
    </>
  );
}
