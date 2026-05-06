import { cache } from "react";
import { getPageTitleMapper } from "@/constants/page-title-mapper";

export const getPageTitle = cache((path: string) => {
  const pageTitleMapper = getPageTitleMapper();

  if (path === "/") {
    return pageTitleMapper.scan;
  }

  const segments = path.split("/").filter((segment) => segment !== "");

  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];
    if (segment in pageTitleMapper) {
      return pageTitleMapper[segment as keyof typeof pageTitleMapper];
    }
  }
  return;
});
