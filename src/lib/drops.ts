import type { DropCampaign } from '@/types/drop';

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  complete: boolean;
}

export function createServerClock(serverNow: string, localCapturedAt = Date.now()) {
  const offset = Date.parse(serverNow) - localCapturedAt;
  return {
    offset,
    now(localNow = Date.now()) {
      return localNow + offset;
    },
  };
}

export function countdownParts(targetAt: number, now: number): CountdownParts {
  const remaining = Math.max(0, targetAt - now);
  const wholeSeconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(wholeSeconds / 86400),
    hours: Math.floor((wholeSeconds % 86400) / 3600),
    minutes: Math.floor((wholeSeconds % 3600) / 60),
    seconds: wholeSeconds % 60,
    complete: remaining === 0,
  };
}

export function mapDropsByProduct(campaigns: DropCampaign[]): Map<string, DropCampaign> {
  const map = new Map<string, DropCampaign>();
  campaigns.forEach((campaign) => {
    map.set(String(campaign.productId), campaign);
    map.set(campaign.productSlug, campaign);
  });
  return map;
}

export function latestPresaleLaunch(items: Array<{ product: { drop?: DropCampaign } }>): string | null {
  const launches = items
    .map((item) => item.product.drop)
    .filter((drop): drop is DropCampaign => Boolean(drop && drop.status !== 'released'))
    .map((drop) => drop.launchAt)
    .sort((a, b) => Date.parse(b) - Date.parse(a));
  return launches[0] || null;
}

export function hasMixedPresaleCart(items: Array<{ product: { drop?: DropCampaign } }>): boolean {
  const hasPresale = items.some((item) => item.product.drop && item.product.drop.status !== 'released');
  const hasRegular = items.some((item) => !item.product.drop || item.product.drop.status === 'released');
  return hasPresale && hasRegular;
}

