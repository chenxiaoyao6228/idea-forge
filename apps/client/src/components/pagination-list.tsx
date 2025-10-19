import useRequest from "@ahooksjs/use-request";
import { useInView } from "react-intersection-observer";
import * as React from "react";
import { Card } from '@idea/ui/shadcn/ui/card';
import { Skeleton } from '@idea/ui/shadcn/ui/skeleton';
import { useTranslation } from "react-i18next";
import { BasePageResult } from "@idea/contracts";

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
  const [page, setPage] = React.useState(1);
  const [allData, setAllData] = React.useState<T[]>([]);

  const { data, loading, error, run } = useRequest(
    async (pageNum: number) => {
      const result = await fetchFn({
        page: pageNum,
        limit,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      return result;
    },
    {
      manual: true,
      onSuccess: (result) => {
        if (result.pagination.page === 1) {
          setAllData(result.data);
        } else {
          setAllData((prev) => [...prev, ...result.data]);
        }
      },
    },
  );

  React.useEffect(() => {
    run(1);
  }, [run]);

  React.useEffect(() => {
    if (inView && data && data.pagination.page < Math.ceil(data.pagination.total / data.pagination.limit)) {
      run(page + 1);
      setPage((prev) => prev + 1);
    }
  }, [inView, data, page, run]);

  if (loading && allData.length === 0) {
    return (
      <div className={className}>
        {Array.from({ length: 3 })
          .map((_, index) => ({ id: index.toString() }))
          .map((item) => (
            <Card key={`skeleton-${item.id}`} className="p-4 mb-4">
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

  if (allData.length === 0) {
    return empty || null;
  }

  return (
    <div className={className}>
      {heading}
      {allData.map((item, index) => renderItem(item, index))}
      <div ref={ref} style={{ height: "1px" }}>
        {loading && (
          <Card className="p-4">
            <Skeleton className="h-6 w-full" />
          </Card>
        )}
      </div>
    </div>
  );
}
