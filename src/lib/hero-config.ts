/**
 * Hero configuration loader.
 *
 * Reads the hero display config from the WordPress plugin "Nakama Hero Manager"
 * (endpoint: /wp-json/nakama/v1/hero-config) with a short timeout and Next.js
 * fetch caching. On ANY error/timeout it returns a hardcoded default so the
 * homepage hero never breaks.
 */

export interface HeroVideoSources {
  webm: string;
  mp4: string;
  /** Optional flat URL fallback (any format). */
  url?: string;
}

export interface HeroPageMedia {
  image?: string;
  video?: string;
}

export interface HeroConfig {
  home: HeroVideoSources;
  all_pages?: HeroPageMedia;
  pages?: Record<string, HeroPageMedia>;
}

/** Current hardcoded homepage hero sources (in-code fallback). */
const DEFAULT_HERO_CONFIG: HeroConfig = {
  home: {
    webm: 'https://nakamabordados.com/wp-content/uploads/2026/01/banner2.webm',
    mp4: 'https://nakamabordados.com/wp-content/uploads/2026/01/banner2.mp4',
  },
};

const WP_BASE = process.env.WP_REST_URL || 'https://nakamabordados.com';
const HERO_ENDPOINT = `${WP_BASE}/?rest_route=/nakama/v1/hero-config`;

/**
 * Defensively normalize/merge an unknown JSON payload over the defaults so any
 * missing (or empty-string) key always falls back to a working value.
 */
function normalizeConfig(raw: unknown): HeroConfig {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_HERO_CONFIG;
  }

  const data = raw as Partial<HeroConfig>;
  const home = (data.home && typeof data.home === 'object' ? data.home : {}) as Partial<HeroVideoSources>;

  const merged: HeroConfig = {
    home: {
      webm: home.webm || DEFAULT_HERO_CONFIG.home.webm,
      mp4: home.mp4 || DEFAULT_HERO_CONFIG.home.mp4,
      ...(home.url ? { url: home.url } : {}),
    },
  };

  if (data.all_pages && typeof data.all_pages === 'object') {
    merged.all_pages = data.all_pages as HeroPageMedia;
  }
  if (data.pages && typeof data.pages === 'object') {
    merged.pages = data.pages as Record<string, HeroPageMedia>;
  }

  return merged;
}

/**
 * Fetch the hero config from WordPress. Never throws — always resolves to a
 * usable HeroConfig (falling back to the hardcoded defaults on any failure).
 */
export async function getHeroConfig(): Promise<HeroConfig> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

  try {
    const response = await fetch(HERO_ENDPOINT, {
      signal: controller.signal,
      next: { revalidate: 300 }, // Cache 5 minutes.
    });

    if (!response.ok) {
      return DEFAULT_HERO_CONFIG;
    }

    const json: unknown = await response.json();
    return normalizeConfig(json);
  } catch {
    // Timeout, network error, or malformed JSON — use safe defaults.
    return DEFAULT_HERO_CONFIG;
  } finally {
    clearTimeout(timeoutId);
  }
}
