export type UserRole = "passenger" | "driver" | "admin";

export type RideStatus =
  | "requested"
  | "searching"
  | "accepted"
  | "arriving"
  | "in_progress"
  | "completed"
  | "cancelled";

export type RideCategory = "standard" | "comfort" | "premium" | "moto";

export type DriverApprovalStatus = "pending" | "approved" | "rejected" | "documents_requested" | "in_review";

export type SubscriptionPlan = "essencial" | "premium";

export type RewardLevel = "Bronze" | "Prata" | "Ouro" | "Diamante";

export interface User {
  id: string;
  email: string;
  phone: string;
  role: UserRole;
  name: string;
  cpf?: string;
  birth_date?: string;
  avatar?: string;
  created_at: string;
}

export interface Passenger {
  id: string;
  user_id: string;
  favorite_places: { name: string; address: string; lat: number; lng: number }[];
  rating: number;
  total_rides: number;
}

export interface Driver {
  id: string;
  user_id: string;
  vehicle_model: string;
  vehicle_color: string;
  plate: string;
  status: "online" | "offline";
  approval_status: DriverApprovalStatus;
  license_doc?: string;
  vehicle_doc?: string;
  rating: number;
  subscription_id?: string;
  active_plan?: SubscriptionPlan;
  plan_expires_at?: string;
  lat: number;
  lng: number;
  total_rides: number;
  earnings_today: number;
  earnings_week: number;
  earnings_month: number;
}

export interface Ride {
  id: string;
  passenger_id: string;
  driver_id?: string;
  passenger_name: string;
  passenger_phone: string;
  passenger_rating: number;
  driver_name?: string;
  driver_phone?: string;
  driver_rating?: number;
  vehicle_info?: string;
  plate?: string;
  origin_address: string;
  origin_lat: number;
  origin_lng: number;
  dest_address: string;
  dest_lat: number;
  dest_lng: number;
  price: number;
  distance_km: number;
  duration_mins: number;
  category: RideCategory;
  status: RideStatus;
  created_at: string;
  completed_at?: string;
  drivecash_earned: number;
  payment_method: "cash" | "pix" | "credit_card" | "wallet";
}

export interface Subscription {
  id: string;
  driver_id: string;
  plan_type: SubscriptionPlan;
  status: "active" | "expired" | "pending";
  price: number;
  created_at: string;
  expires_at: string;
  mercado_pago_payment_id?: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  drivecash_points: number;
  level: RewardLevel;
  total_points_earned: number;
}

export type TransactionType =
  | "cashback"
  | "ride_payment"
  | "subscription"
  | "referral"
  | "bonus"
  | "reward_redemption"
  | "withdrawal";

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  amount: number;
  points: number;
  type: TransactionType;
  description: string;
  created_at: string;
}

export interface DriverLocation {
  id: string;
  driver_id: string;
  lat: number;
  lng: number;
  updated_at: string;
}

export interface Rating {
  id: string;
  ride_id: string;
  from_user_id: string;
  to_user_id: string;
  score: number;
  comment?: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  type: "ride" | "financial" | "system" | "promotion";
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
  admin_reply?: string;
  created_at: string;
}

export interface RewardCatalogItem {
  id: string;
  title: string;
  description: string;
  points_cost: number;
  category: "posto" | "farmacia" | "supermercado" | "restaurante" | "outros";
  discount_value: string;
  partner_name: string;
  partner_logo?: string;
  image?: string;
}

export interface InviteCode {
  id: string;
  user_id: string;
  code: string;
  uses_count: number;
  total_earned_cashback: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  reward_points: number;
  progress: number;
  target: number;
  completed: boolean;
  expires_in: string;
}

export interface PartnerOffer {
  id: string;
  partner: string;
  category: string;
  discount: string;
  pointsCost: number;
  description: string;
  code: string;
  image: string;
}

export interface ChatMessage {
  id: string;
  ride_id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  created_at: string;
}
