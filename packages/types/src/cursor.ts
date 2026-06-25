export type CursorDirection = 'forward' | 'backward';

export type PageAnchor = {
  pageIndex: number;
  cursor: string | null;
};

export type SeekPageRequest = {
  limit?: number;
  pageIndex?: number;
  anchorPageIndex?: number;
  anchorCursor?: string | null;
  direction?: CursorDirection;
};

export type SeekPageResult<T> = {
  items: T[];
  pageIndex: number;
  pageSize: number;
  totalRows: number;
  pageCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor: string | null;
  previousCursor: string | null;
  anchors: PageAnchor[];
};

export type CursorPage = {
  limit?: number;
  cursor?: string | null;
};

export type CursorResult<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};