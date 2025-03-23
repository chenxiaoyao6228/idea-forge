import { useCallback, useEffect, useRef, useState } from "react";
import { Search as SearchIcon, FileText, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useDebounce } from "react-use";
import { documentApi } from "@/apis/document";
import type { CommonDocumentResponse } from "shared";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Loading from "../../../components/loading";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<CommonDocumentResponse[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useDebounce(
    () => {
      if (!keyword.trim()) {
        setDocuments([]);
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
        .then(({ documents }) => {
          setDocuments(documents);
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

  const handleDocumentClick = (doc: CommonDocumentResponse) => {
    navigate(`/doc/${doc.id}`);
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
            placeholder={t("Search document by title...")}
            className="border-0 p-0 focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="max-h-[400px] min-h-[200px] overflow-y-auto custom-scrollbar">
        {loading && <Loading />}

        {!loading && keyword && documents.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <FileSearch className="h-8 w-8" />
            <p>{t("No documents found")}</p>
          </div>
        )}

        {!loading && documents.length > 0 && (
          <div className="flex flex-col gap-1 mt-2">
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
      </div>
    </>
  );
}
