export type DropStatus = 'presale' | 'sold_out' | 'released';
export type DropTimerPosition = 'overlay' | 'below';

export interface DropPrice {
  itemId: number;
  presalePrice: string;
  launchPrice: string;
}

export interface DropCampaign {
  id: number;
  productId: number;
  productSlug: string;
  status: DropStatus;
  launchAt: string;
  serverNow: string;
  unlimited: boolean;
  remaining: number | null;
  timerPosition: DropTimerPosition;
  prices: DropPrice[];
}

export interface DropsResponse {
  items: DropCampaign[];
  serverNow: string;
}

