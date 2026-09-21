import type { MouseEvent } from "react";
import { isSafeHttpUrl } from "@/lib/events";

/**
 * The "More info" link for an event. Rendered only for absolute http(s) URLs;
 * new data is validated at the API boundary, but rows saved before that check
 * existed (or with no link at all) must not become a broken or unsafe anchor.
 */
export function EventLink({
  link,
  className,
  onClick,
}: {
  link: string;
  className?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
}) {
  if (!isSafeHttpUrl(link)) return null;
  return (
    <a
      className={className}
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
    >
      More info &#8599;
    </a>
  );
}
