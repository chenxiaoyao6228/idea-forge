import { useCallback, useEffect, useRef, useState } from "react";
import { Search as SearchIcon, FileText, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useDebounce } from "react-use";
import { documentApi } from "@/apis/document";
import type { CommonDocumentResponse, ContentMatch } from "shared";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Loading from "../../../components/loading";
import { TextSelection } from "@tiptap/pm/state";
import scrollIntoView from "scroll-into-view-if-needed";
import { useEditorStore } from "../stores/editor-store";

export function SearchDocDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "group/tree-node relative flex w-full items-center py-1 px-2",
            "rounded-lg transition-colors",
            "hover:bg-accent/50 dark:hover:bg-accent/25",
            "text-sm font-normal",
          )}
        >
          <SearchIcon className="h-4 w-4 mr-2 shrink-0" />
          <span className="truncate">{t("Search")}</span>
          {/* <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd> */}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{t("Search Documents")}</DialogTitle>
        </DialogHeader>
        <SearchPanel onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const editor = useEditorStore((state) => state.editor);
  const inputRef = useRef<HTMLInputElement>(null);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<CommonDocumentResponse[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [contentMatches, setContentMatches] = useState<Array<ContentMatch>>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useDebounce(
    () => {
      if (!keyword.trim()) {
        setDocuments([]);
        setContentMatches([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      documentApi
        .search({
          keyword,
          limit: 10,
          page: 1,
          sort: "updatedAt",
          order: "desc",
        })
        .then(({ documents, contentMatches }) => {
          setDocuments(documents);
          setContentMatches(contentMatches);
        })
        .catch((error) => {
          console.error("Search failed:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    300, // delay in milliseconds
    [keyword],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKeyword(value);
    setCurrentIndex(-1);
  };

  const handleDocumentClick = async (doc: CommonDocumentResponse, nodeId?: string) => {
    // First navigate to the document if it's different from current
    if (window.location.pathname !== `/doc/${doc.id}`) {
      await navigate(`/doc/${doc.id}${nodeId ? `#${nodeId}` : ""}`);
      onClose();
      return;
    }

    // If we're already on the correct document, handle the scroll and focus
    if (nodeId && editor) {
      const element = editor.view.dom.querySelector(`[data-node-id="${nodeId}"]`);
      if (element) {
        const pos = editor.view.posAtDOM(element, 0);

        // Create a transaction to add highlight
        let tr = editor.view.state.tr;

        // Set selection
        tr.setSelection(new TextSelection(tr.doc.resolve(pos)));

        // Add highlight mark
        tr = editor.view.state.tr.addMark(pos, pos + element.textContent!.length, editor.schema.marks.highlight.create());

        editor.view.dispatch(tr);
        editor.view.focus();

        // Delay remove highlight
        setTimeout(() => {
          const tr = editor.view.state.tr.removeMark(pos, pos + element.textContent!.length, editor.schema.marks.highlight);
          editor.view.dispatch(tr);
        }, 2000);

        // scroll to position
        scrollIntoView(element, {
          scrollMode: "if-needed",
          block: "center",
          inline: "nearest",
          behavior: "smooth",
        });
      }
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCurrentIndex((prev) => (prev < documents.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && currentIndex >= 0) {
      e.preventDefault();
      const selectedDoc = documents[currentIndex];
      if (selectedDoc) handleDocumentClick(selectedDoc);
    }
  };

  return (
    <>
      <div>
        <div className="flex items-center gap-2 border rounded-md px-3">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={keyword}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={t("Search document by title or content...")}
            className="border-0 p-0 focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="max-h-[400px] min-h-[200px] overflow-y-auto custom-scrollbar">
        {loading && <Loading />}

        {!loading && keyword && documents.length === 0 && contentMatches?.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <FileSearch className="h-8 w-8" />
            <p>{t("No documents found")}</p>
          </div>
        )}

        {!loading && (documents.length > 0 || (contentMatches && contentMatches.length > 0)) && (
          <div className="flex flex-col gap-1 mt-2">
            {/* Title matches */}
            {documents.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-medium text-muted-foreground mb-2">{t("Title matches")}</div>
                {documents.map((doc, index) => (
                  <Button
                    key={doc.id}
                    variant="ghost"
                    className={cn("flex items-center gap-2 justify-start h-auto py-2 px-3", index === currentIndex && "bg-accent/50 dark:bg-accent/25")}
                    onClick={() => handleDocumentClick(doc)}
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate text-left">{doc.title || t("Untitled")}</span>
                  </Button>
                ))}
              </div>
            )}

            {/* Content matches */}
            {contentMatches && contentMatches.length > 0 && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">{t("Content matches")}</div>
                {contentMatches.map((match) => (
                  <div key={match.id} className="mb-4">
                    <div className="text-sm font-medium mb-1">{match.title || t("Untitled")}</div>
                    {match.matches.map((m, i) => (
                      <Button
                        key={`${m.text}-${i}`}
                        variant="ghost"
                        className="flex items-center gap-2 justify-start h-auto py-2 px-3 w-full"
                        onClick={() =>
                          handleDocumentClick(
                            {
                              id: match.id.toString(),
                              title: match.title,
                              parentId: null,
                              icon: null,
                              isStarred: false,
                              createdAt: new Date(),
                              updatedAt: new Date(),
                              isArchived: false,
                              isLeaf: true,
                              position: 0,
                            },
                            m.nodeId,
                          )
                        }
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        <div className="flex-1 text-left">
                          <div className="text-sm text-muted-foreground">
                            {m.beforeText && <span className="opacity-75">{m.beforeText}</span>}
                            {highlightKeyword(m.text, keyword)}
                            {m.afterText && <span className="opacity-75">{m.afterText}</span>}
                          </div>
                          {/* <div className="text-xs text-muted-foreground mt-1">{t(m.type)}</div> */}
                        </div>
                      </Button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// Helper function to highlight keywords
function highlightKeyword(text: string, keyword: string) {
  if (!keyword.trim()) return text;
  const parts = text.split(new RegExp(`(${keyword})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <span key={part} className="bg-yellow-200 dark:bg-yellow-900">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
