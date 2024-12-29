import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCurrentDocument } from "@/pages/doc/store";

export default function Cover({ url, scrollY }: { url: string; scrollY?: number }) {
  const { currentDocument } = useCurrentDocument();

  if (!currentDocument || !currentDocument?.coverImage) return null;

  return (
    <div className={cn("relative w-full h-[35vh] group", !url && "h-[12vh]", url && "bg-muted")}>
      {!!url && <img src={url} alt="Cover" className="object-cover w-full h-full" style={{ transform: `translateY(-${scrollY}px)` }} />}
    </div>
  );
}

Cover.Skeleton = function CoverSkeleton() {
  return <Skeleton className="w-full h-[12vh]" />;
};
