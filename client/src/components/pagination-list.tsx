import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { BasePageResult } from "contracts";

export interface InfiniteListItem {
  id?: string;
  updatedAt?: string;
  createdAt?: string;
}

type Props<T extends InfiniteListItem> = {
  queryKey: string[];
  fetchFn: (options: {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }) => Promise<BasePageResult<T>>;
  renderItem: (item: T, index: number) => React.ReactNode;
  heading?: React.ReactNode;
  empty?: React.ReactNode;
  className?: string;
  limit?: number;
};

export function InfiniteList<T extends InfiniteListItem>({ queryKey, fetchFn, renderItem, heading, empty, className, limit = 25 }: Props<T>) {
  const { ref, inView } = useInView();
  const { t } = useTranslation();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      const result = await fetchFn({
        page: pageParam,
        limit,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      return result;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.pagination.total / lastPage.pagination.limit);
      const nextPage = lastPage.pagination.page + 1;
      return nextPage <= totalPages ? nextPage : undefined;
    },
  });

  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className={className}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={`skeleton-${i}`} className="p-4 mb-4">
            <Skeleton className="h-6 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <p className="text-destructive">{t("Error loading items. Please try again.")}</p>
      </Card>
    );
  }

  const items = data?.pages.flatMap((page) => page.data) ?? [];

  if (items.length === 0) {
    return empty || null;
  }

  return (
    <div className={className}>
      {heading}
      {items.map((item, index) => renderItem(item, index))}
      <div ref={ref} style={{ height: "1px" }}>
        {isFetchingNextPage && (
          <Card className="p-4">
            <Skeleton className="h-6 w-full" />
          </Card>
        )}
      </div>
    </div>
  );
}
