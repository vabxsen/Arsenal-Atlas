import { useEffect } from 'react';
import { normalizeOrigin } from '@shared/site';

const SITE_URL = normalizeOrigin(import.meta.env.VITE_SITE_URL);

/**
 * Document metadata for a route.
 *
 * Client-side tags are the runtime half of the SEO story; the build-time
 * prerender writes the same values into the static HTML so crawlers and
 * link unfurlers see them without executing JavaScript.
 */

const JSON_LD_ID = 'route-jsonld';

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string): void {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function setLink(rel: string, href: string): void {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.rel = rel;
    document.head.appendChild(tag);
  }
  tag.href = href;
}

export interface DocumentMeta {
  title: string;
  description: string;
  image?: string | undefined;
  canonical?: string;
  jsonLd?: Record<string, unknown>;
}

export function useDocumentMeta({ title, description, image, canonical, jsonLd }: DocumentMeta) {
  useEffect(() => {
    document.title = title;

    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);

    if (image) {
      setMeta('meta[property="og:image"]', 'property', 'og:image', image);
      setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);
    }

    const url = canonical ? `${SITE_URL}${canonical}` : window.location.href;
    setLink('canonical', url);
    setMeta('meta[property="og:url"]', 'property', 'og:url', url);

    // Structured data is replaced wholesale per route rather than merged, so
    // a previous page's schema never leaks into the next one.
    document.getElementById(JSON_LD_ID)?.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.id = JSON_LD_ID;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      document.getElementById(JSON_LD_ID)?.remove();
    };
  }, [title, description, image, canonical, jsonLd]);
}
