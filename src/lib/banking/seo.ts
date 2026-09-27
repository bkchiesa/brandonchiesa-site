import { SITE_CANONICAL, SITE_NAME } from "../site";

export function absoluteUrl(path: string): string {
  return new URL(path.replace(/^\//, ""), SITE_CANONICAL).href;
}

export function breadcrumbJsonLd(items: readonly { name: string; path: string }[]): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function calculatorJsonLd(opts: {
  name: string;
  path: string;
  description: string;
}): Record<string, unknown> {
  return {
    "@type": "WebApplication",
    name: opts.name,
    url: absoluteUrl(opts.path),
    description: opts.description,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    provider: {
      "@type": "Person",
      name: SITE_NAME,
      url: SITE_CANONICAL,
    },
  };
}

export function collectionJsonLd(opts: {
  name: string;
  path: string;
  description: string;
  items: readonly { name: string; path: string }[];
}): Record<string, unknown> {
  return {
    "@type": "CollectionPage",
    name: opts.name,
    url: absoluteUrl(opts.path),
    description: opts.description,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_CANONICAL,
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: opts.items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: absoluteUrl(item.path),
      })),
    },
  };
}

export function graphJsonLd(nodes: readonly Record<string, unknown>[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

export const HOME_CRUMB = { name: "Home", path: "/" };
export const BANKING_CRUMB = { name: "Banking", path: "/banking/" };
