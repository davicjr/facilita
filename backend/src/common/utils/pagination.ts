type PaginationOptions = {
  defaultPageSize?: number;
  maxPageSize?: number;
};

export const parsePagination = (
  page?: string,
  pageSize?: string,
  options: PaginationOptions = {},
) => {
  const parsedPage = Number.parseInt(page ?? '', 10);
  const parsedPageSize = Number.parseInt(pageSize ?? '', 10);
  const resolvedPage =
    Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  const fallbackPageSize = options.defaultPageSize ?? 20;
  const resolvedPageSize =
    Number.isNaN(parsedPageSize) || parsedPageSize < 1
      ? fallbackPageSize
      : Math.min(parsedPageSize, options.maxPageSize ?? 100);
  const shouldPaginate = page !== undefined || pageSize !== undefined;

  return {
    page: resolvedPage,
    pageSize: resolvedPageSize,
    skip: (resolvedPage - 1) * resolvedPageSize,
    take: resolvedPageSize,
    shouldPaginate,
  };
};
