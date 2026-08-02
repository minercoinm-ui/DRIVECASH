import {
  User,
  Passenger,
  Driver,
  Ride,
  Wallet,
  WalletTransaction,
  RewardCatalogItem,
  Mission,
  SupportTicket,
  InviteCode,
  NotificationItem
} from "../types";

export const MOCK_USERS: User[] = [];

export const MOCK_PASSENGER: Passenger | null = null;

export const MOCK_DRIVERS: Driver[] = [];

export const MOCK_WALLETS: Record<string, Wallet> = {};

export const MOCK_TRANSACTIONS: WalletTransaction[] = [];

export const MOCK_RIDES: Ride[] = [];

export const MOCK_REWARD_CATALOG: RewardCatalogItem[] = [];

export const MOCK_MISSIONS: Mission[] = [];

export const MOCK_SUPPORT_TICKETS: SupportTicket[] = [];

export const MOCK_INVITE_CODES: Record<string, InviteCode> = {};

export const MOCK_NOTIFICATIONS: NotificationItem[] = [];

export const PASSENGER_RANKING: { rank: number; name: string; points: number; level: string; trips: number }[] = [];
