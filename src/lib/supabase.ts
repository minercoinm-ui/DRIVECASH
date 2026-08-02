import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { formatCPF } from "./validators";
import {
  User,
  Passenger,
  Driver,
  Ride,
  Wallet,
  WalletTransaction,
  Subscription,
  SupportTicket,
  NotificationItem,
  RewardCatalogItem,
  InviteCode,
  Rating,
  DriverApprovalStatus,
  RideStatus,
  ChatMessage
} from "../types";
import {
  MOCK_USERS,
  MOCK_PASSENGER,
  MOCK_DRIVERS,
  MOCK_WALLETS,
  MOCK_TRANSACTIONS,
  MOCK_RIDES,
  MOCK_REWARD_CATALOG,
  MOCK_SUPPORT_TICKETS,
  MOCK_INVITE_CODES,
  MOCK_NOTIFICATIONS
} from "../data/mockData";

const STORAGE_KEYS = {
  USERS: "drivecash_users",
  CURRENT_USER: "drivecash_current_user",
  PASSENGERS: "drivecash_passengers",
  DRIVERS: "drivecash_drivers",
  RIDES: "drivecash_rides",
  WALLETS: "drivecash_wallets",
  TRANSACTIONS: "drivecash_transactions",
  CATALOG: "drivecash_reward_catalog",
  TICKETS: "drivecash_support_tickets",
  INVITES: "drivecash_invite_codes",
  NOTIFS: "drivecash_notifications",
  SUBSCRIPTIONS: "drivecash_subscriptions",
  RATINGS: "drivecash_ratings",
  SETTINGS: "drivecash_settings",
  PASSWORDS: "drivecash_passwords",
  MESSAGES: "drivecash_chat_messages"
};

// Helper validators & sanitizers for Supabase URL and Key
function maskKey(key: string): string {
  if (!key) return "(empty)";
  const trimmed = key.trim();
  if (trimmed.length <= 6) return trimmed.slice(0, 1) + "..." + trimmed.slice(-1);
  return `${trimmed.slice(0, 3)}...${trimmed.slice(-3)} (${trimmed.length} chars)`;
}

function cleanSupabaseUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  let trimmed = rawUrl.trim().replace(/^["']|["']$/g, "");
  if (!trimmed) return "";
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    trimmed = "https://" + trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("run.app") || parsed.hostname.includes("ais-dev") || parsed.hostname.includes("ais-pre")) {
      console.warn("[SUPABASE AUDIT WARNING] VITE_SUPABASE_URL points to AI Studio app runner instead of Supabase:", parsed.origin);
      return "";
    }
    return parsed.origin;
  } catch {
    return "";
  }
}

function isValidSupabaseKey(key: any): boolean {
  if (!key || typeof key !== "string") return false;
  return key.trim().length > 15;
}

// Initialize Real Supabase Client if environment keys exist
const rawSupabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (typeof process !== "undefined" ? process.env.VITE_SUPABASE_URL : "");
const rawSupabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (typeof process !== "undefined" ? process.env.VITE_SUPABASE_ANON_KEY : "");

const resolvedSupabaseUrl = cleanSupabaseUrl(rawSupabaseUrl);
const resolvedSupabaseKey = typeof rawSupabaseAnonKey === "string" ? rawSupabaseAnonKey.trim() : "";

export let realSupabaseClient: SupabaseClient | null = null;

console.log("[SUPABASE CLIENT RESOLVED URL]", resolvedSupabaseUrl || "(none/invalid)");
console.log("[SUPABASE CLIENT RESOLVED KEY (MASKED)]", maskKey(resolvedSupabaseKey));

if (resolvedSupabaseUrl && isValidSupabaseKey(resolvedSupabaseKey)) {
  try {
    realSupabaseClient = createClient(resolvedSupabaseUrl, resolvedSupabaseKey);
    console.log("[SUPABASE AUDIT LOG] Real Supabase Client connected successfully to:", resolvedSupabaseUrl);
  } catch (err: any) {
    console.error("[SUPABASE AUDIT ERROR] Failed to initialize real Supabase client:", err?.message || err);
    realSupabaseClient = null;
  }
} else {
  console.warn(
    "[SUPABASE AUDIT NOTICE] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY are not defined or invalid. Running DriveCash DB Client with local storage and real-time multi-device server sync."
  );
  realSupabaseClient = null;
}

// Storage Helpers
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("[SUPABASE AUDIT ERROR] Storage parse error for key:", key, e);
  }
  localStorage.setItem(key, JSON.stringify(fallback));
  return fallback;
}

function saveToStorage<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("[SUPABASE AUDIT ERROR] Storage save error for key:", key, e);
  }
}

// Database Manager
class SupabaseSimulatedClient {
  private users: User[];
  private currentUser: User | null;
  private passengers: Passenger[];
  private drivers: Driver[];
  private rides: Ride[];
  private wallets: Record<string, Wallet>;
  private transactions: WalletTransaction[];
  private catalog: RewardCatalogItem[];
  private supportTickets: SupportTicket[];
  private inviteCodes: Record<string, InviteCode>;
  private notifications: NotificationItem[];
  private subscriptions: Subscription[];
  private ratings: Rating[];
  private userPasswords: Record<string, string>;
  private chatMessages: ChatMessage[];
  public doublePointsActive: boolean = false;
  private listeners: Set<() => void> = new Set();
  private channel: BroadcastChannel | null = null;
  private syncTimer: any = null;

  constructor() {
    this.users = loadFromStorage(STORAGE_KEYS.USERS, []);
    this.currentUser = loadFromStorage(STORAGE_KEYS.CURRENT_USER, null);
    this.passengers = loadFromStorage(STORAGE_KEYS.PASSENGERS, []);
    this.drivers = loadFromStorage(STORAGE_KEYS.DRIVERS, []);
    this.rides = loadFromStorage(STORAGE_KEYS.RIDES, []);
    this.wallets = loadFromStorage(STORAGE_KEYS.WALLETS, {});
    this.transactions = loadFromStorage(STORAGE_KEYS.TRANSACTIONS, []);
    this.catalog = loadFromStorage(STORAGE_KEYS.CATALOG, []);
    this.supportTickets = loadFromStorage(STORAGE_KEYS.TICKETS, []);
    this.inviteCodes = loadFromStorage(STORAGE_KEYS.INVITES, {});
    this.notifications = loadFromStorage(STORAGE_KEYS.NOTIFS, []);
    this.subscriptions = loadFromStorage(STORAGE_KEYS.SUBSCRIPTIONS, []);
    this.ratings = loadFromStorage(STORAGE_KEYS.RATINGS, []);
    this.userPasswords = loadFromStorage(STORAGE_KEYS.PASSWORDS, {});
    this.chatMessages = loadFromStorage(STORAGE_KEYS.MESSAGES, []);

    // Purge legacy mock users and mock data from local storage cache
    const mockIds = ["usr_passenger_1", "usr_driver_1", "usr_driver_2", "usr_admin_1"];
    if (Array.isArray(this.users)) {
      this.users = this.users.filter((u) => u && !mockIds.includes(u.id));
      if (this.currentUser && mockIds.includes(this.currentUser.id)) {
        this.currentUser = null;
        saveToStorage(STORAGE_KEYS.CURRENT_USER, null);
      }
    }
    if (Array.isArray(this.rides)) {
      this.rides = this.rides.filter((r) => r && !mockIds.includes(r.passenger_id) && (!r.driver_id || !mockIds.includes(r.driver_id)));
    }
    if (Array.isArray(this.drivers)) {
      this.drivers = this.drivers.filter((d) => d && !mockIds.includes(d.user_id));
    }
    if (Array.isArray(this.passengers)) {
      this.passengers = this.passengers.filter((p) => p && !mockIds.includes(p.user_id));
    }
    if (Array.isArray(this.catalog)) {
      this.catalog = this.catalog.filter((c) => c && !c.id.startsWith("cat_"));
    }
    if (Array.isArray(this.subscriptions)) {
      this.subscriptions = this.subscriptions.filter((s) => s && !mockIds.includes(s.driver_id));
    }

    // Multi-tab BroadcastChannel
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.channel = new BroadcastChannel("drivecash_realtime_sync");
        this.channel.onmessage = () => {
          this.reloadFromStorage();
          this.notifyListeners();
        };
      } catch (e) {
        console.error("[SUPABASE AUDIT ERROR] BroadcastChannel init error:", e);
      }
    }

    // Window storage listener for same-origin tabs
    if (typeof window !== "undefined") {
      window.addEventListener("storage", () => {
        this.reloadFromStorage();
        this.notifyListeners();
      });
    }

    // Initialize Supabase Realtime Channel if real client exists
    if (realSupabaseClient) {
      try {
        realSupabaseClient
          .channel("drivecash_db_changes")
          .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
            console.log("[SUPABASE REALTIME CHANGE LOG]", payload.eventType, payload.table, payload.new);
            this.fetchServerState();
          })
          .subscribe((status) => {
            console.log("[SUPABASE REALTIME STATUS LOG]", status);
          });
      } catch (e) {
        console.error("[SUPABASE REALTIME ERROR]", e);
      }
    }

    // Start background sync polling with server and Supabase
    this.startServerSyncLoop();
  }

  private startServerSyncLoop() {
    if (typeof window === "undefined") return;

    // Initial sync
    this.fetchServerState();

    // Poll server every 3 seconds for cross-device synchronization
    this.syncTimer = setInterval(() => {
      this.fetchServerState();
    }, 3000);
  }

  private async fetchServerState() {
    // 1. Fetch from real Supabase DB if client exists
    if (realSupabaseClient) {
      try {
        const [
          { data: dbUsers },
          { data: dbPassengers },
          { data: dbDrivers },
          { data: dbRides },
          { data: dbWallets },
          { data: dbTransactions },
          { data: dbSubscriptions },
          { data: dbTickets },
          { data: dbInvites },
          { data: dbNotifs },
          { data: dbCatalog }
        ] = await Promise.all([
          realSupabaseClient.from("users").select("*"),
          realSupabaseClient.from("passengers").select("*"),
          realSupabaseClient.from("drivers").select("*"),
          realSupabaseClient.from("rides").select("*").order("created_at", { ascending: false }),
          realSupabaseClient.from("wallets").select("*"),
          realSupabaseClient.from("wallet_transactions").select("*").order("created_at", { ascending: false }),
          realSupabaseClient.from("subscriptions").select("*").order("created_at", { ascending: false }),
          realSupabaseClient.from("support_tickets").select("*").order("created_at", { ascending: false }),
          realSupabaseClient.from("invite_codes").select("*"),
          realSupabaseClient.from("notifications").select("*").order("created_at", { ascending: false }),
          realSupabaseClient.from("reward_catalog").select("*")
        ]);

        let stateChanged = false;

        if (dbUsers) {
          this.users = dbUsers;
          saveToStorage(STORAGE_KEYS.USERS, this.users);
          stateChanged = true;
        }

        if (dbPassengers) {
          this.passengers = dbPassengers;
          saveToStorage(STORAGE_KEYS.PASSENGERS, this.passengers);
          stateChanged = true;
        }

        if (dbDrivers) {
          this.drivers = dbDrivers;
          saveToStorage(STORAGE_KEYS.DRIVERS, this.drivers);
          stateChanged = true;
        }

        if (dbRides) {
          this.rides = dbRides;
          saveToStorage(STORAGE_KEYS.RIDES, this.rides);
          stateChanged = true;
        }

        if (dbWallets) {
          const walletMap: Record<string, Wallet> = {};
          dbWallets.forEach((w: Wallet) => {
            walletMap[w.user_id] = w;
          });
          this.wallets = walletMap;
          saveToStorage(STORAGE_KEYS.WALLETS, this.wallets);
          stateChanged = true;
        }

        if (dbTransactions) {
          this.transactions = dbTransactions;
          saveToStorage(STORAGE_KEYS.TRANSACTIONS, this.transactions);
          stateChanged = true;
        }

        if (dbSubscriptions) {
          this.subscriptions = dbSubscriptions;
          saveToStorage(STORAGE_KEYS.SUBSCRIPTIONS, this.subscriptions);
          stateChanged = true;
        }

        if (dbTickets) {
          this.supportTickets = dbTickets;
          saveToStorage(STORAGE_KEYS.TICKETS, this.supportTickets);
          stateChanged = true;
        }

        if (dbInvites) {
          const inviteMap: Record<string, InviteCode> = {};
          dbInvites.forEach((inv: InviteCode) => {
            inviteMap[inv.user_id] = inv;
          });
          this.inviteCodes = inviteMap;
          saveToStorage(STORAGE_KEYS.INVITES, this.inviteCodes);
          stateChanged = true;
        }

        if (dbNotifs) {
          this.notifications = dbNotifs;
          saveToStorage(STORAGE_KEYS.NOTIFS, this.notifications);
          stateChanged = true;
        }

        if (dbCatalog) {
          this.catalog = dbCatalog;
          saveToStorage(STORAGE_KEYS.CATALOG, this.catalog);
          stateChanged = true;
        }

        if (stateChanged) {
          this.notifyListeners();
        }
      } catch (e: any) {
        console.warn("[SUPABASE DB FETCH EXCEPTION]", e?.message || e);
      }
    }

    // 2. Fetch from Express sync endpoint as fallback
    try {
      const res = await fetch("/api/sync/state");
      if (res.ok) {
        const data = await res.json();
        let changed = false;

        if (Array.isArray(data.drivers) && data.drivers.length > 0) {
          data.drivers.forEach((srvDrv: Driver) => {
            const idx = this.drivers.findIndex((d) => d.id === srvDrv.id || d.user_id === srvDrv.user_id);
            if (idx >= 0) {
              const current = this.drivers[idx];
              if (current.lat !== srvDrv.lat || current.lng !== srvDrv.lng || current.status !== srvDrv.status || current.approval_status !== srvDrv.approval_status) {
                this.drivers[idx] = { ...current, ...srvDrv };
                changed = true;
              }
            } else {
              this.drivers.push(srvDrv);
              changed = true;
            }
          });
        }

        if (Array.isArray(data.users) && data.users.length > 0) {
          data.users.forEach((srvUser: User) => {
            if (!this.users.some((u) => u.id === srvUser.id || u.email === srvUser.email)) {
              this.users.push(srvUser);
              changed = true;
            }
          });
        }

        if (Array.isArray(data.rides) && data.rides.length > 0) {
          data.rides.forEach((srvRide: Ride) => {
            const idx = this.rides.findIndex((r) => r.id === srvRide.id);
            if (idx >= 0) {
              if (this.rides[idx].status !== srvRide.status) {
                this.rides[idx] = { ...this.rides[idx], ...srvRide };
                changed = true;
              }
            } else {
              this.rides.unshift(srvRide);
              changed = true;
            }
          });
        }

        if (Array.isArray(data.chatMessages) && data.chatMessages.length > 0) {
          data.chatMessages.forEach((srvMsg: ChatMessage) => {
            const idx = this.chatMessages.findIndex((m) => m.id === srvMsg.id);
            if (idx >= 0) {
              this.chatMessages[idx] = srvMsg;
            } else {
              this.chatMessages.push(srvMsg);
              changed = true;
            }
          });
        }

        if (changed) {
          saveToStorage(STORAGE_KEYS.DRIVERS, this.drivers);
          saveToStorage(STORAGE_KEYS.USERS, this.users);
          saveToStorage(STORAGE_KEYS.RIDES, this.rides);
          saveToStorage(STORAGE_KEYS.MESSAGES, this.chatMessages);
          this.notifyListeners();
        }
      }
    } catch (err) {
      // Silent error handling
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb());
  }

  private broadcast() {
    if (this.channel) {
      try {
        this.channel.postMessage({ timestamp: Date.now() });
      } catch (e) {
        // Fallback
      }
    }
    this.notifyListeners();
  }

  private reloadFromStorage() {
    this.users = loadFromStorage(STORAGE_KEYS.USERS, this.users);
    this.currentUser = loadFromStorage(STORAGE_KEYS.CURRENT_USER, this.currentUser);
    this.passengers = loadFromStorage(STORAGE_KEYS.PASSENGERS, this.passengers);
    this.drivers = loadFromStorage(STORAGE_KEYS.DRIVERS, this.drivers);
    this.rides = loadFromStorage(STORAGE_KEYS.RIDES, this.rides);
    this.wallets = loadFromStorage(STORAGE_KEYS.WALLETS, this.wallets);
    this.transactions = loadFromStorage(STORAGE_KEYS.TRANSACTIONS, this.transactions);
    this.catalog = loadFromStorage(STORAGE_KEYS.CATALOG, this.catalog);
    this.supportTickets = loadFromStorage(STORAGE_KEYS.TICKETS, this.supportTickets);
    this.inviteCodes = loadFromStorage(STORAGE_KEYS.INVITES, this.inviteCodes);
    this.notifications = loadFromStorage(STORAGE_KEYS.NOTIFS, this.notifications);
    this.subscriptions = loadFromStorage(STORAGE_KEYS.SUBSCRIPTIONS, this.subscriptions);
    this.chatMessages = loadFromStorage(STORAGE_KEYS.MESSAGES, this.chatMessages);
  }

  // Real-time Chat Methods
  public getChatMessages(rideId: string): ChatMessage[] {
    if (!rideId) return [];
    return this.chatMessages
      .filter((m) => m && m.ride_id === rideId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  public async sendChatMessage(
    rideId: string,
    senderId: string,
    senderName: string,
    text: string
  ): Promise<ChatMessage> {
    const msg: ChatMessage = {
      id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      ride_id: rideId,
      sender_id: senderId,
      sender_name: senderName,
      text: text.trim(),
      created_at: new Date().toISOString()
    };
    this.chatMessages.push(msg);
    saveToStorage(STORAGE_KEYS.MESSAGES, this.chatMessages);

    if (realSupabaseClient) {
      const { error } = await realSupabaseClient.from("chat_messages").insert(msg);
      if (error) console.error("[SUPABASE AUDIT ERROR] Failed to insert chat message in Supabase DB:", error.message, error);
    }

    this.postServerSync("/api/sync/chat-message", { message: msg });
    this.broadcast();
    return msg;
  }

  // Auth Methods
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public setCurrentUser(user: User | null) {
    console.log("[SUPABASE AUDIT LOG] setCurrentUser:", user ? user.email : "null");
    this.currentUser = user;
    saveToStorage(STORAGE_KEYS.CURRENT_USER, user);
    this.broadcast();
  }

  public async loginWithEmail(email: string, password?: string): Promise<{ user: User; message: string }> {
    console.log("[SUPABASE LOG] loginWithEmail called for:", email);
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check local users store
    const existing = this.users.find(
      (u) => u.email && u.email.trim().toLowerCase() === cleanEmail
    );
    if (existing) {
      if (password && this.userPasswords[cleanEmail]) {
        if (this.userPasswords[cleanEmail] !== password) {
          throw new Error("E-mail ou senha incorretos. Por favor, tente novamente.");
        }
      }
      await this.initUserWalletAndProfile(existing);
      this.setCurrentUser(existing);
      return { user: existing, message: "Login realizado com sucesso!" };
    }

    // 2. Check real Supabase Auth if client exists
    if (realSupabaseClient && password) {
      try {
        const { data: authData, error: authError } = await realSupabaseClient.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (authData?.user) {
          const { data: dbUser } = await realSupabaseClient
            .from("users")
            .select("*")
            .eq("email", cleanEmail)
            .maybeSingle();

          const userObj: User = {
            id: dbUser?.id || authData.user.id,
            email: dbUser?.email || cleanEmail,
            phone: dbUser?.phone || (authData.user.user_metadata?.phone || ""),
            role: dbUser?.role || (authData.user.user_metadata?.role || "passenger"),
            name: dbUser?.name || (authData.user.user_metadata?.name || cleanEmail.split("@")[0]),
            cpf: dbUser?.cpf || authData.user.user_metadata?.cpf,
            birth_date: dbUser?.birth_date || authData.user.user_metadata?.birth_date,
            created_at: dbUser?.created_at || new Date().toISOString()
          };

          const existingIdx = this.users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
          if (existingIdx >= 0) {
            this.users[existingIdx] = userObj;
          } else {
            this.users.push(userObj);
          }
          saveToStorage(STORAGE_KEYS.USERS, this.users);

          this.setCurrentUser(userObj);
          await this.initUserWalletAndProfile(userObj);
          return { user: userObj, message: "Login realizado com sucesso!" };
        }
      } catch (err: any) {
        console.warn("[SUPABASE AUTH NOTICE] Exception during signInWithPassword:", err?.message || err);
      }
    }

    // 3. Fallback: create user if login is performed for quick local testing
    const autoUser: User = {
      id: "usr_" + Date.now(),
      email: cleanEmail,
      phone: "",
      role: "passenger",
      name: cleanEmail.split("@")[0] || "Usuário",
      created_at: new Date().toISOString()
    };
    if (password) {
      this.userPasswords[cleanEmail] = password;
      saveToStorage(STORAGE_KEYS.PASSWORDS, this.userPasswords);
    }
    this.users.push(autoUser);
    saveToStorage(STORAGE_KEYS.USERS, this.users);
    await this.initUserWalletAndProfile(autoUser);
    this.setCurrentUser(autoUser);
    return { user: autoUser, message: "Login realizado com sucesso!" };
  }

  public async resetPassword(email: string, newPassword?: string): Promise<{ success: boolean; message: string }> {
    console.log("[SUPABASE AUDIT LOG] resetPassword called for:", email);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      throw new Error("Informe o e-mail cadastrado.");
    }

    const existing = this.users.find((u) => u.email.toLowerCase() === cleanEmail);

    // 1. Send password reset link using Supabase Auth if real client available
    if (realSupabaseClient) {
      try {
        const { error: authError } = await realSupabaseClient.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined
        });
        if (authError) {
          console.warn("[SUPABASE AUTH NOTICE] resetPasswordForEmail notice:", authError.message);
        } else {
          console.log("[SUPABASE AUTH SUCCESS] Password reset email triggered for:", cleanEmail);
        }
      } catch (err: any) {
        console.warn("[SUPABASE AUTH NOTICE] Exception during resetPasswordForEmail:", err?.message || err);
      }
    }

    // 2. If user provides a new password, update it in storage and auth
    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        throw new Error("A nova senha deve possuir no mínimo 6 caracteres.");
      }
      this.userPasswords[cleanEmail] = newPassword.trim();
      saveToStorage(STORAGE_KEYS.PASSWORDS, this.userPasswords);

      if (realSupabaseClient) {
        try {
          await realSupabaseClient.auth.updateUser({ password: newPassword.trim() });
        } catch (e) {
          // ignore
        }
      }

      return {
        success: true,
        message: "Sua senha foi atualizada com sucesso! Você já pode realizar o login com a nova senha."
      };
    }

    // 3. Otherwise, return success confirmation for the reset request
    if (existing || realSupabaseClient) {
      return {
        success: true,
        message: `Instruções de redefinição de senha processadas para ${cleanEmail}! Caso prefira, digite sua nova senha no campo abaixo.`
      };
    }

    throw new Error("Não encontramos nenhuma conta cadastrada com este e-mail.");
  }

  private async safeUpsertUser(user: User): Promise<boolean> {
    if (!realSupabaseClient) return false;

    // 1. First attempt: full user object (including cpf and birth_date)
    const { data, error } = await realSupabaseClient
      .from("users")
      .upsert(user)
      .select();

    if (!error) {
      console.log("[SUPABASE AUDIT SUCCESS] User persisted in public.users:", data);
      return true;
    }

    console.warn("[SUPABASE AUDIT NOTICE] Full user upsert notice:", error.message);

    // 2. Fallback: if birth_date or cpf column does not exist yet in public.users
    if (
      error.message.includes("birth_date") ||
      error.message.includes("cpf") ||
      error.message.includes("schema cache") ||
      error.message.includes("column")
    ) {
      const baseUser: Record<string, any> = {
        id: user.id,
        email: user.email,
        phone: user.phone || "",
        role: user.role || "passenger",
        name: user.name || "Usuário",
        avatar: user.avatar || null,
        created_at: user.created_at || new Date().toISOString()
      };

      const { data: fbData, error: fbError } = await realSupabaseClient
        .from("users")
        .upsert(baseUser)
        .select();

      if (!fbError) {
        console.log("[SUPABASE AUDIT SUCCESS] User persisted with base schema in public.users:", fbData);
        return true;
      }
      console.error("[SUPABASE AUDIT ERROR] Fallback user upsert failed:", fbError.message, fbError);
    }

    return false;
  }

  public async loginWithPhone(phone: string): Promise<{ user: User; message: string }> {
    console.log("[SUPABASE AUDIT LOG] loginWithPhone called for:", phone);
    const cleanPhone = phone.trim();
    const existing = this.users.find((u) => u.phone === cleanPhone);
    if (existing) {
      this.setCurrentUser(existing);
      return { user: existing, message: "Login realizado com sucesso via Telefone!" };
    }

    const newUser: User = {
      id: "usr_" + Date.now(),
      email: `user_${Date.now()}@drivecash.com.br`,
      phone: cleanPhone,
      role: "passenger",
      name: "Passageiro " + cleanPhone.slice(-4),
      created_at: new Date().toISOString()
    };
    this.users.push(newUser);
    saveToStorage(STORAGE_KEYS.USERS, this.users);

    const newPas: Passenger = {
      id: "pas_" + Date.now(),
      user_id: newUser.id,
      favorite_places: [],
      rating: 5.0,
      total_rides: 0
    };
    this.passengers.push(newPas);
    saveToStorage(STORAGE_KEYS.PASSENGERS, this.passengers);

    if (realSupabaseClient) {
      await this.safeUpsertUser(newUser);

      const { data: pasData, error: pasError } = await realSupabaseClient
        .from("passengers")
        .upsert(newPas)
        .select();
      if (pasError) {
        console.error("[SUPABASE AUDIT ERROR] loginWithPhone passenger upsert failed:", pasError.message, pasError);
      } else {
        console.log("[SUPABASE AUDIT SUCCESS] Passenger persisted in public.passengers:", pasData);
      }
    }

    await this.initUserWalletAndProfile(newUser);
    this.setCurrentUser(newUser);

    this.postServerSync("/api/sync/user", { user: newUser, passenger: newPas });

    return { user: newUser, message: "Cadastro via Telefone concluído com sucesso!" };
  }

  public async registerUser(data: {
    name: string;
    email: string;
    phone: string;
    cpf?: string;
    birthDate?: string;
    avatar?: string;
    password?: string;
    role: "passenger" | "driver";
    vehicleModel?: string;
    vehicleColor?: string;
    plate?: string;
    licenseDoc?: string;
    vehicleDoc?: string;
    approvalStatus?: DriverApprovalStatus;
  }): Promise<{ user: User; message: string }> {
    console.log("[SUPABASE AUDIT LOG] registerUser called with data:", data);

    const cleanEmail = data.email.trim().toLowerCase();

    // 1. Check duplicate email in local state
    const existingEmail = this.users.find((u) => u.email && u.email.trim().toLowerCase() === cleanEmail);
    if (existingEmail) {
      throw new Error("Este e-mail já está cadastrado no sistema.");
    }

    // 2. Check duplicate CPF in local state
    if (data.cpf) {
      const cleanCpf = data.cpf.replace(/\D/g, "");
      const existingCpf = this.users.find((u) => u.cpf && u.cpf.replace(/\D/g, "") === cleanCpf);
      if (existingCpf) {
        throw new Error("Este CPF já está cadastrado no sistema.");
      }
    }

    let userId = "usr_" + Date.now();

    // Store password in local state map for password verification
    if (data.password) {
      this.userPasswords[cleanEmail] = data.password;
      saveToStorage(STORAGE_KEYS.PASSWORDS, this.userPasswords);
    }

    // 3. Supabase Auth Signup (if real client & password present)
    if (realSupabaseClient && data.password) {
      try {
        const { data: authData } = await realSupabaseClient.auth.signUp({
          email: cleanEmail,
          password: data.password,
          options: {
            data: {
              name: data.name,
              cpf: data.cpf,
              phone: data.phone,
              birth_date: data.birthDate,
              avatar: data.avatar,
              role: data.role
            }
          }
        });
        if (authData?.user) {
          userId = authData.user.id;
        }
      } catch (err: any) {
        console.warn("[SUPABASE AUTH NOTICE] Auth signup notice, proceeding locally:", err?.message || err);
      }
    }

    const newUser: User = {
      id: userId,
      email: cleanEmail,
      phone: data.phone,
      role: data.role,
      name: data.name,
      cpf: data.cpf ? formatCPF(data.cpf) : undefined,
      birth_date: data.birthDate || undefined,
      avatar: data.avatar || undefined,
      created_at: new Date().toISOString()
    };

    this.users.push(newUser);
    saveToStorage(STORAGE_KEYS.USERS, this.users);

    let newPas: Passenger | undefined;
    let newDrv: Driver | undefined;

    if (data.role === "passenger") {
      newPas = {
        id: "pas_" + Date.now(),
        user_id: userId,
        favorite_places: [],
        rating: 5.0,
        total_rides: 0
      };
      this.passengers.push(newPas);
      saveToStorage(STORAGE_KEYS.PASSENGERS, this.passengers);
    } else {
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);

      newDrv = {
        id: "drv_" + Date.now(),
        user_id: userId,
        vehicle_model: data.vehicleModel || "Chevrolet Onix",
        vehicle_color: data.vehicleColor || "Prata",
        plate: data.plate || "DRV-1234",
        status: "online",
        approval_status: data.approvalStatus || (data.licenseDoc ? "in_review" : "pending"),
        license_doc: data.licenseDoc || undefined,
        vehicle_doc: data.vehicleDoc || undefined,
        rating: 5.0,
        active_plan: "premium",
        plan_expires_at: expires.toISOString(),
        lat: undefined,
        lng: undefined,
        total_rides: 0,
        earnings_today: 0,
        earnings_week: 0,
        earnings_month: 0
      };
      this.drivers.push(newDrv);
      saveToStorage(STORAGE_KEYS.DRIVERS, this.drivers);
    }

    // Direct, awaited DB write to public.users FIRST to ensure parent row exists for foreign key references
    if (realSupabaseClient) {
      await this.safeUpsertUser(newUser);

      if (newPas) {
        const { data: pasData, error: pasError } = await realSupabaseClient
          .from("passengers")
          .upsert(newPas)
          .select();
        if (pasError) {
          console.error("[SUPABASE AUDIT ERROR] Failed to persist passenger in public.passengers:", pasError.message, pasError);
        } else {
          console.log("[SUPABASE AUDIT SUCCESS] Passenger persisted in public.passengers:", pasData);
        }
      }

      if (newDrv) {
        const { data: drvData, error: drvError } = await realSupabaseClient
          .from("drivers")
          .upsert(newDrv)
          .select();
        if (drvError) {
          console.error("[SUPABASE AUDIT ERROR] Failed to persist driver in public.drivers:", drvError.message, drvError);
        } else {
          console.log("[SUPABASE AUDIT SUCCESS] Driver persisted in public.drivers:", drvData);
        }
      }
    }

    await this.initUserWalletAndProfile(newUser);
    this.setCurrentUser(newUser);

    // Sync to Express Server
    this.postServerSync("/api/sync/user", {
      user: newUser,
      driver: newDrv,
      passenger: newPas
    });

    this.broadcast();
    return { user: newUser, message: `Cadastro como ${data.role === "driver" ? "Motorista" : "Passageiro"} concluído com sucesso!` };
  }

  private async initUserWalletAndProfile(user: User): Promise<void> {
    const isValidUUID = (str: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    if (!this.wallets[user.id]) {
      const walletId = isValidUUID(user.id) ? user.id : ("wal_" + user.id);

      const newWallet: Wallet = {
        id: walletId,
        user_id: user.id,
        balance: 25.00,
        drivecash_points: 200,
        level: "Bronze",
        total_points_earned: 200
      };
      this.wallets[user.id] = newWallet;
      saveToStorage(STORAGE_KEYS.WALLETS, this.wallets);

      const txId = isValidUUID(user.id) ? (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "tx_" + Date.now()) : ("tx_" + Date.now());

      const newTx: WalletTransaction = {
        id: txId,
        wallet_id: newWallet.id,
        amount: 25.00,
        points: 200,
        type: "bonus",
        description: "Bônus de Boas-Vindas DriveCash!",
        created_at: new Date().toISOString()
      };
      this.transactions.push(newTx);
      saveToStorage(STORAGE_KEYS.TRANSACTIONS, this.transactions);

      if (realSupabaseClient) {
        // STEP 1: Ensure parent user exists in public.users table
        const { data: userCheck } = await realSupabaseClient
          .from("users")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!userCheck) {
          await this.safeUpsertUser(user);
        }

        // STEP 2: Create Wallet in public.wallets (or public.wallet) FIRST
        let walletCreated = false;
        let { data: walData, error: walError } = await realSupabaseClient
          .from("wallets")
          .upsert(newWallet)
          .select();

        if (walError) {
          console.error("[SUPABASE AUDIT ERROR] Failed to upsert wallet in public.wallets:", walError.message, walError);
          // Try fallback table name 'wallet'
          const { data: fallbackWalData, error: fallbackWalError } = await realSupabaseClient
            .from("wallet")
            .upsert(newWallet)
            .select();

          if (!fallbackWalError) {
            walletCreated = true;
            console.log("[SUPABASE AUDIT SUCCESS] Wallet persisted in public.wallet:", fallbackWalData);
          } else {
            console.error("[SUPABASE AUDIT ERROR] Failed fallback upsert in public.wallet:", fallbackWalError.message);
          }
        } else {
          walletCreated = true;
          console.log("[SUPABASE AUDIT SUCCESS] Wallet persisted in public.wallets:", walData);
        }

        // STEP 3: ONLY AFTER wallet is created, insert into wallet_transactions!
        if (walletCreated) {
          const { data: txData, error: txError } = await realSupabaseClient
            .from("wallet_transactions")
            .insert(newTx)
            .select();

          if (txError) {
            console.error("[SUPABASE AUDIT ERROR] Failed to insert bonus transaction in public.wallet_transactions:", txError.message, txError);
          } else {
            console.log("[SUPABASE AUDIT SUCCESS] Bonus transaction persisted in public.wallet_transactions:", txData);
          }
        } else {
          console.warn("[SUPABASE AUDIT NOTICE] Skipped wallet_transactions insert because wallet creation was not confirmed in DB.");
        }
      }
    }

    if (!this.inviteCodes[user.id]) {
      const code = "DRIVE" + (user.name ? user.name.split(" ")[0].toUpperCase() : "USER") + Math.floor(100 + Math.random() * 900);
      const newInv: InviteCode = {
        id: "inv_" + user.id,
        user_id: user.id,
        code,
        uses_count: 0,
        total_earned_cashback: 0
      };
      this.inviteCodes[user.id] = newInv;
      saveToStorage(STORAGE_KEYS.INVITES, this.inviteCodes);

      if (realSupabaseClient) {
        const { data: invData, error: invError } = await realSupabaseClient
          .from("invite_codes")
          .upsert(newInv)
          .select();
        if (invError) {
          console.error("[SUPABASE AUDIT ERROR] Failed to upsert invite code:", invError.message, invError);
        } else {
          console.log("[SUPABASE AUDIT SUCCESS] Invite code persisted:", invData);
        }
      }
    }
  }

  // Driver Location & Status Methods
  public async updateDriverLocation(driverUserId: string, lat: number, lng: number): Promise<void> {
    console.log(`[SUPABASE AUDIT LOG] updateDriverLocation: driverUserId=${driverUserId}, lat=${lat}, lng=${lng}`);
    let drv = this.getDriverByUserId(driverUserId);

    if (!drv) {
      console.warn(`[SUPABASE AUDIT WARN] Driver record not found for userId=${driverUserId}. Creating/restoring driver record.`);
      const user = this.users.find((u) => u.id === driverUserId);
      drv = {
        id: "drv_" + driverUserId,
        user_id: driverUserId,
        vehicle_model: "Veículo",
        vehicle_color: "",
        plate: "",
        status: "online",
        approval_status: "approved",
        rating: 5.0,
        active_plan: "premium",
        lat,
        lng,
        total_rides: 0,
        earnings_today: 0,
        earnings_week: 0,
        earnings_month: 0
      };
      this.drivers.push(drv);
    } else {
      drv.lat = lat;
      drv.lng = lng;
    }

    saveToStorage(STORAGE_KEYS.DRIVERS, this.drivers);

    this.postServerSync("/api/sync/driver-location", { userId: driverUserId, lat, lng });

    if (realSupabaseClient) {
      const { data, error } = await realSupabaseClient
        .from("drivers")
        .update({ lat, lng, updated_at: new Date().toISOString() })
        .eq("user_id", driverUserId)
        .select();
      if (error) {
        console.error("[SUPABASE AUDIT ERROR] Failed to update driver location in Supabase DB:", error.message, error);
      } else {
        console.log("[SUPABASE AUDIT SUCCESS] Driver location updated in Supabase DB:", data);
      }
    }

    this.broadcast();
  }

  public async setDriverStatus(driverUserId: string, status: "online" | "offline"): Promise<void> {
    console.log(`[SUPABASE AUDIT LOG] setDriverStatus: driverUserId=${driverUserId}, status=${status}`);
    const drv = this.getDriverByUserId(driverUserId);
    if (drv) {
      drv.status = status;
      saveToStorage(STORAGE_KEYS.DRIVERS, this.drivers);

      this.postServerSync("/api/sync/driver-status", { userId: driverUserId, status });

      if (realSupabaseClient) {
        const { data, error } = await realSupabaseClient
          .from("drivers")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("user_id", driverUserId)
          .select();
        if (error) {
          console.error("[SUPABASE AUDIT ERROR] Failed to update driver status in Supabase DB:", error.message, error);
        } else {
          console.log("[SUPABASE AUDIT SUCCESS] Driver status updated in Supabase DB:", data);
        }
      }

      this.broadcast();
    }
  }

  public async setDriverApproval(driverId: string, status: DriverApprovalStatus): Promise<void> {
    console.log(`[SUPABASE AUDIT LOG] setDriverApproval: driverId=${driverId}, status=${status}`);
    const drv = this.drivers.find((d) => d.id === driverId || d.user_id === driverId);
    if (drv) {
      drv.approval_status = status;
      if (status === "approved") {
        drv.status = "online";
      }
      saveToStorage(STORAGE_KEYS.DRIVERS, this.drivers);

      this.postServerSync("/api/sync/driver-status", { userId: drv.user_id, status: drv.status, approvalStatus: status });

      if (realSupabaseClient) {
        const { data, error } = await realSupabaseClient
          .from("drivers")
          .update({ approval_status: status, status: drv.status, updated_at: new Date().toISOString() })
          .eq("user_id", drv.user_id)
          .select();
        if (error) {
          console.error("[SUPABASE AUDIT ERROR] Failed to update driver approval in Supabase DB:", error.message, error);
        } else {
          console.log("[SUPABASE AUDIT SUCCESS] Driver approval updated in Supabase DB:", data);
        }
      }

      this.broadcast();
    }
  }

  public async updateDriverDocuments(driverUserId: string, licenseDoc: string, vehicleDoc: string): Promise<void> {
    console.log(`[SUPABASE AUDIT LOG] updateDriverDocuments: driverUserId=${driverUserId}, CNH=${licenseDoc}, CRLV=${vehicleDoc}`);
    const drv = this.getDriverByUserId(driverUserId);
    if (drv) {
      drv.license_doc = licenseDoc;
      drv.vehicle_doc = vehicleDoc;
      drv.approval_status = "in_review";
      saveToStorage(STORAGE_KEYS.DRIVERS, this.drivers);

      if (realSupabaseClient) {
        const { data, error } = await realSupabaseClient
          .from("drivers")
          .update({ license_doc: licenseDoc, vehicle_doc: vehicleDoc, approval_status: "in_review" })
          .eq("user_id", driverUserId)
          .select();
        if (error) {
          console.error("[SUPABASE AUDIT ERROR] Failed to update driver docs in Supabase DB:", error.message, error);
        } else {
          console.log("[SUPABASE AUDIT SUCCESS] Driver docs updated in Supabase DB:", data);
        }
      }

      this.broadcast();
    }
  }

  // Getters
  public getUsers(): User[] {
    return this.users;
  }

  public getPassengers(): Passenger[] {
    return this.passengers;
  }

  public getDrivers(): Driver[] {
    return this.drivers;
  }

  public getDriverByUserId(userId: string): Driver | undefined {
    return this.drivers.find((d) => d.user_id === userId || d.id === userId);
  }

  public getRides(): Ride[] {
    return this.rides;
  }

  public getWallet(userId: string): Wallet {
    if (!this.wallets[userId]) {
      this.initUserWalletAndProfile(
        this.users.find((u) => u.id === userId) || {
          id: userId,
          email: "user@drivecash.com",
          phone: "11999990000",
          role: "passenger",
          name: "Usuário",
          created_at: new Date().toISOString()
        }
      );
    }
    return this.wallets[userId];
  }

  public getTransactions(userId: string): WalletTransaction[] {
    const wal = this.getWallet(userId);
    return this.transactions.filter((tx) => tx.wallet_id === wal.id);
  }

  public getCatalog(): RewardCatalogItem[] {
    return this.catalog;
  }

  public getSupportTickets(): SupportTicket[] {
    return this.supportTickets;
  }

  public getInviteCode(userId: string): InviteCode {
    if (!this.inviteCodes[userId]) {
      this.inviteCodes[userId] = {
        id: "inv_" + userId,
        user_id: userId,
        code: "DRIVE" + Math.floor(10000 + Math.random() * 90000),
        uses_count: 0,
        total_earned_cashback: 0
      };
      saveToStorage(STORAGE_KEYS.INVITES, this.inviteCodes);
    }
    return this.inviteCodes[userId];
  }

  public getNotifications(userId: string): NotificationItem[] {
    return this.notifications.filter((n) => n.user_id === userId || n.user_id === "all");
  }

  // Ride Operations
  public async createRide(rideData: Omit<Ride, "id" | "created_at" | "status" | "drivecash_earned">): Promise<Ride> {
    console.log("[SUPABASE AUDIT LOG] createRide called:", rideData);
    const pointsMultiplier = this.doublePointsActive ? 20 : 10;
    const earnedPoints = Math.round(rideData.price * pointsMultiplier);

    const newRide: Ride = {
      ...rideData,
      id: "ride_" + Date.now(),
      status: "searching",
      created_at: new Date().toISOString(),
      drivecash_earned: earnedPoints
    };

    this.rides.unshift(newRide);
    saveToStorage(STORAGE_KEYS.RIDES, this.rides);

    this.postServerSync("/api/sync/ride", { ride: newRide });

    if (realSupabaseClient) {
      const { data, error } = await realSupabaseClient
        .from("rides")
        .insert(newRide)
        .select();
      if (error) {
        console.error("[SUPABASE AUDIT ERROR] Failed to insert ride in public.rides:", error.message, error);
      } else {
        console.log("[SUPABASE AUDIT SUCCESS] Ride created in public.rides:", data);
      }
    }

    this.broadcast();
    return newRide;
  }

  public async updateRideStatus(
    rideId: string,
    status: RideStatus,
    driver?: Driver
  ): Promise<Ride | undefined> {
    console.log(`[SUPABASE AUDIT LOG] updateRideStatus: rideId=${rideId}, status=${status}, driver=${driver?.user_id}`);
    const ride = this.rides.find((r) => r.id === rideId);
    if (!ride) return undefined;

    ride.status = status;
    if (driver) {
      const driverUser = this.users.find((u) => u.id === driver.user_id);
      ride.driver_id = driver.user_id;
      ride.driver_name = driverUser?.name || "Motorista Conectado";
      ride.driver_phone = driverUser?.phone || "(11) 99999-9999";
      ride.driver_rating = driver.rating;
      ride.vehicle_info = `${driver.vehicle_model} (${driver.vehicle_color})`;
      ride.plate = driver.plate;
    }

    let cbTx: WalletTransaction | undefined;
    let pasWallet: Wallet | undefined;
    let drvObj: Driver | undefined;

    if (status === "completed") {
      ride.completed_at = new Date().toISOString();

      // Credit Passenger Wallet
      pasWallet = this.getWallet(ride.passenger_id);
      pasWallet.drivecash_points += ride.drivecash_earned;
      pasWallet.balance += Number((ride.price * 0.05).toFixed(2));
      pasWallet.total_points_earned += ride.drivecash_earned;

      if (pasWallet.total_points_earned > 7000) pasWallet.level = "Diamante";
      else if (pasWallet.total_points_earned > 3000) pasWallet.level = "Ouro";
      else if (pasWallet.total_points_earned > 1000) pasWallet.level = "Prata";
      else pasWallet.level = "Bronze";

      saveToStorage(STORAGE_KEYS.WALLETS, this.wallets);

      cbTx = {
        id: "tx_" + Date.now(),
        wallet_id: pasWallet.id,
        amount: Number((ride.price * 0.05).toFixed(2)),
        points: ride.drivecash_earned,
        type: "cashback",
        description: `Cashback Corrida: ${ride.origin_address.slice(0, 15)} -> ${ride.dest_address.slice(0, 15)}`,
        created_at: new Date().toISOString()
      };
      this.transactions.unshift(cbTx);
      saveToStorage(STORAGE_KEYS.TRANSACTIONS, this.transactions);

      if (ride.driver_id) {
        drvObj = this.getDriverByUserId(ride.driver_id);
        if (drvObj) {
          const fareShare = ride.price * 0.85;
          drvObj.earnings_today += fareShare;
          drvObj.earnings_week += fareShare;
          drvObj.earnings_month += fareShare;
          drvObj.total_rides += 1;
          saveToStorage(STORAGE_KEYS.DRIVERS, this.drivers);
        }
      }
    }

    saveToStorage(STORAGE_KEYS.RIDES, this.rides);

    this.postServerSync("/api/sync/ride", { ride });

    if (realSupabaseClient) {
      const { data: rideData, error: rideErr } = await realSupabaseClient
        .from("rides")
        .update(ride)
        .eq("id", rideId)
        .select();
      if (rideErr) {
        console.error("[SUPABASE AUDIT ERROR] Failed to update ride status in public.rides:", rideErr.message, rideErr);
      } else {
        console.log("[SUPABASE AUDIT SUCCESS] Ride status updated in public.rides:", rideData);
      }

      if (pasWallet) {
        const { error: walErr } = await realSupabaseClient
          .from("wallets")
          .update(pasWallet)
          .eq("id", pasWallet.id);
        if (walErr) console.error("[SUPABASE AUDIT ERROR] Failed to update wallet in public.wallets:", walErr.message, walErr);
      }
      if (cbTx) {
        const { error: txErr } = await realSupabaseClient
          .from("wallet_transactions")
          .insert(cbTx);
        if (txErr) console.error("[SUPABASE AUDIT ERROR] Failed to insert transaction in public.wallet_transactions:", txErr.message, txErr);
      }
      if (drvObj) {
        const { error: drvErr } = await realSupabaseClient
          .from("drivers")
          .update(drvObj)
          .eq("user_id", drvObj.user_id);
        if (drvErr) console.error("[SUPABASE AUDIT ERROR] Failed to update driver in public.drivers:", drvErr.message, drvErr);
      }
    }

    this.broadcast();
    return ride;
  }

  public async addWalletBalance(userId: string, amount: number, paymentMethodName: string = "PIX"): Promise<{ success: boolean; newBalance: number }> {
    console.log(`[SUPABASE AUDIT LOG] addWalletBalance: userId=${userId}, amount=${amount}`);
    const wal = this.getWallet(userId);
    wal.balance += amount;
    saveToStorage(STORAGE_KEYS.WALLETS, this.wallets);

    const tx: WalletTransaction = {
      id: "tx_" + Date.now(),
      wallet_id: wal.id,
      amount: amount,
      points: 0,
      type: "bonus",
      description: `Recarga de Saldo via ${paymentMethodName}`,
      created_at: new Date().toISOString()
    };
    this.transactions.unshift(tx);
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, this.transactions);

    if (realSupabaseClient) {
      const { error: walErr } = await realSupabaseClient.from("wallets").update({ balance: wal.balance }).eq("user_id", userId);
      if (walErr) console.error("[SUPABASE AUDIT ERROR] Failed to update wallet balance:", walErr.message, walErr);

      const { error: txErr } = await realSupabaseClient.from("wallet_transactions").insert(tx);
      if (txErr) console.error("[SUPABASE AUDIT ERROR] Failed to insert topup transaction:", txErr.message, txErr);
    }

    this.broadcast();
    return { success: true, newBalance: wal.balance };
  }

  public async withdrawWalletBalance(userId: string, amount: number, pixKey: string): Promise<{ success: boolean; message: string }> {
    console.log(`[SUPABASE AUDIT LOG] withdrawWalletBalance: userId=${userId}, amount=${amount}, pixKey=${pixKey}`);
    const wal = this.getWallet(userId);
    if (wal.balance < amount) {
      return { success: false, message: "Saldo insuficiente para saque." };
    }
    wal.balance -= amount;
    saveToStorage(STORAGE_KEYS.WALLETS, this.wallets);

    const tx: WalletTransaction = {
      id: "tx_" + Date.now(),
      wallet_id: wal.id,
      amount: -amount,
      points: 0,
      type: "withdrawal",
      description: `Saque PIX para chave ${pixKey}`,
      created_at: new Date().toISOString()
    };
    this.transactions.unshift(tx);
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, this.transactions);

    if (realSupabaseClient) {
      const { error: walErr } = await realSupabaseClient.from("wallets").update({ balance: wal.balance }).eq("user_id", userId);
      if (walErr) console.error("[SUPABASE AUDIT ERROR] Failed to update wallet balance on withdraw:", walErr.message, walErr);

      const { error: txErr } = await realSupabaseClient.from("wallet_transactions").insert(tx);
      if (txErr) console.error("[SUPABASE AUDIT ERROR] Failed to insert withdraw transaction:", txErr.message, txErr);
    }

    this.broadcast();
    return { success: true, message: `Saque de R$ ${amount.toFixed(2)} enviado com sucesso via PIX!` };
  }

  public async updateDriverSubscription(driverUserId: string, plan: "essencial" | "premium", paymentId: string): Promise<void> {
    console.log(`[SUPABASE AUDIT LOG] updateDriverSubscription: driverUserId=${driverUserId}, plan=${plan}`);
    const drv = this.getDriverByUserId(driverUserId);
    if (drv) {
      drv.active_plan = plan;
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      drv.plan_expires_at = expires.toISOString();
      saveToStorage(STORAGE_KEYS.DRIVERS, this.drivers);

      const sub: Subscription = {
        id: "sub_" + Date.now(),
        driver_id: driverUserId,
        plan_type: plan,
        status: "active",
        price: plan === "essencial" ? 79.90 : 119.90,
        created_at: new Date().toISOString(),
        expires_at: expires.toISOString(),
        mercado_pago_payment_id: paymentId
      };
      this.subscriptions.unshift(sub);
      saveToStorage(STORAGE_KEYS.SUBSCRIPTIONS, this.subscriptions);

      if (realSupabaseClient) {
        const { error: drvErr } = await realSupabaseClient.from("drivers").update({ active_plan: plan, plan_expires_at: expires.toISOString() }).eq("user_id", driverUserId);
        if (drvErr) console.error("[SUPABASE AUDIT ERROR] Failed to update driver subscription plan:", drvErr.message, drvErr);

        const { error: subErr } = await realSupabaseClient.from("subscriptions").insert(sub);
        if (subErr) console.error("[SUPABASE AUDIT ERROR] Failed to insert subscription:", subErr.message, subErr);
      }

      this.broadcast();
    }
  }

  public async redeemCatalogItem(userId: string, item: RewardCatalogItem): Promise<{ success: boolean; message: string; voucherCode?: string }> {
    console.log(`[SUPABASE AUDIT LOG] redeemCatalogItem: userId=${userId}, item=${item.title}`);
    const wal = this.getWallet(userId);
    if (wal.drivecash_points < item.points_cost) {
      return { success: false, message: `Pontos insuficientes. Você precisa de ${item.points_cost} pontos.` };
    }

    wal.drivecash_points -= item.points_cost;
    saveToStorage(STORAGE_KEYS.WALLETS, this.wallets);

    const voucherCode = "DRIVE-" + item.category.toUpperCase().slice(0, 3) + "-" + Math.floor(100000 + Math.random() * 900000);

    const tx: WalletTransaction = {
      id: "tx_" + Date.now(),
      wallet_id: wal.id,
      amount: 0,
      points: -item.points_cost,
      type: "reward_redemption",
      description: `Resgate Voucher: ${item.title} (Código: ${voucherCode})`,
      created_at: new Date().toISOString()
    };
    this.transactions.unshift(tx);
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, this.transactions);

    if (realSupabaseClient) {
      const { error: walErr } = await realSupabaseClient.from("wallets").update({ drivecash_points: wal.drivecash_points }).eq("user_id", userId);
      if (walErr) console.error("[SUPABASE AUDIT ERROR] Failed to update points on redeem:", walErr.message, walErr);

      const { error: txErr } = await realSupabaseClient.from("wallet_transactions").insert(tx);
      if (txErr) console.error("[SUPABASE AUDIT ERROR] Failed to insert reward redemption tx:", txErr.message, txErr);
    }

    this.broadcast();
    return {
      success: true,
      message: `Resgate realizado com sucesso! Utilize o cupom ${voucherCode} no parceiro.`,
      voucherCode
    };
  }

  public async addSupportTicket(userId: string, subject: string, message: string): Promise<SupportTicket> {
    console.log(`[SUPABASE AUDIT LOG] addSupportTicket: userId=${userId}, subject=${subject}`);
    const user = this.users.find((u) => u.id === userId);
    const ticket: SupportTicket = {
      id: "ticket_" + Date.now(),
      user_id: userId,
      user_name: user ? user.name : "Usuário",
      user_role: user ? user.role : "passenger",
      subject,
      message,
      status: "open",
      created_at: new Date().toISOString()
    };
    this.supportTickets.unshift(ticket);
    saveToStorage(STORAGE_KEYS.TICKETS, this.supportTickets);

    if (realSupabaseClient) {
      const { error } = await realSupabaseClient.from("support_tickets").insert(ticket);
      if (error) console.error("[SUPABASE AUDIT ERROR] Failed to insert support ticket:", error.message, error);
    }

    this.broadcast();
    return ticket;
  }

  public async replySupportTicket(ticketId: string, reply: string): Promise<void> {
    console.log(`[SUPABASE AUDIT LOG] replySupportTicket: ticketId=${ticketId}`);
    const t = this.supportTickets.find((x) => x.id === ticketId);
    if (t) {
      t.admin_reply = reply;
      t.status = "resolved";
      saveToStorage(STORAGE_KEYS.TICKETS, this.supportTickets);

      if (realSupabaseClient) {
        const { error } = await realSupabaseClient.from("support_tickets").update({ admin_reply: reply, status: "resolved" }).eq("id", ticketId);
        if (error) console.error("[SUPABASE AUDIT ERROR] Failed to update ticket reply in Supabase DB:", error.message, error);
        else console.log("[SUPABASE AUDIT SUCCESS] Support ticket updated in Supabase DB:", ticketId);
      }

      this.broadcast();
    }
  }

  public async sendPushNotification(title: string, message: string, targetUserId: string = "all"): Promise<void> {
    console.log(`[SUPABASE AUDIT LOG] sendPushNotification: targetUserId=${targetUserId}, title=${title}`);
    const notif: NotificationItem = {
      id: "notif_" + Date.now(),
      user_id: targetUserId,
      title,
      message,
      read: false,
      type: "system",
      created_at: new Date().toISOString()
    };
    this.notifications.unshift(notif);
    saveToStorage(STORAGE_KEYS.NOTIFS, this.notifications);

    if (realSupabaseClient) {
      const { error } = await realSupabaseClient.from("notifications").insert(notif);
      if (error) console.error("[SUPABASE AUDIT ERROR] Failed to insert notification in Supabase DB:", error.message, error);
      else console.log("[SUPABASE AUDIT SUCCESS] Notification inserted in Supabase DB:", notif.id);
    }

    this.broadcast();
  }

  public async applyReferralCode(currentUserId: string, referralCode: string): Promise<{ success: boolean; message: string }> {
    console.log(`[SUPABASE AUDIT LOG] applyReferralCode: currentUserId=${currentUserId}, code=${referralCode}`);
    const targetInvite = Object.values(this.inviteCodes).find(
      (inv) => inv.code.toUpperCase() === referralCode.trim().toUpperCase()
    );

    if (!targetInvite) {
      return { success: false, message: "Código de indicação inválido ou expirado." };
    }

    if (targetInvite.user_id === currentUserId) {
      return { success: false, message: "Você não pode usar seu próprio código de indicação!" };
    }

    targetInvite.uses_count += 1;
    targetInvite.total_earned_cashback += 500;
    saveToStorage(STORAGE_KEYS.INVITES, this.inviteCodes);

    const referrerWal = this.getWallet(targetInvite.user_id);
    referrerWal.drivecash_points += 500;
    referrerWal.balance += 10.00;
    saveToStorage(STORAGE_KEYS.WALLETS, this.wallets);

    const tx1: WalletTransaction = {
      id: "tx_" + Date.now(),
      wallet_id: referrerWal.id,
      amount: 10.00,
      points: 500,
      type: "referral",
      description: "Bônus por indicação de novo amigo!",
      created_at: new Date().toISOString()
    };
    this.transactions.unshift(tx1);

    const myWal = this.getWallet(currentUserId);
    myWal.drivecash_points += 300;
    myWal.balance += 5.00;
    saveToStorage(STORAGE_KEYS.WALLETS, this.wallets);

    const tx2: WalletTransaction = {
      id: "tx_" + (Date.now() + 1),
      wallet_id: myWal.id,
      amount: 5.00,
      points: 300,
      type: "referral",
      description: "Bônus por utilizar código de indicação de amigo!",
      created_at: new Date().toISOString()
    };
    this.transactions.unshift(tx2);

    saveToStorage(STORAGE_KEYS.TRANSACTIONS, this.transactions);

    if (realSupabaseClient) {
      const { error: invErr } = await realSupabaseClient.from("invite_codes").update({ uses_count: targetInvite.uses_count, total_earned_cashback: targetInvite.total_earned_cashback }).eq("id", targetInvite.id);
      if (invErr) console.error("[SUPABASE AUDIT ERROR] Failed to update invite code uses:", invErr.message, invErr);

      const { error: wal1Err } = await realSupabaseClient.from("wallets").update({ balance: referrerWal.balance, drivecash_points: referrerWal.drivecash_points }).eq("id", referrerWal.id);
      if (wal1Err) console.error("[SUPABASE AUDIT ERROR] Failed to update referrer wallet:", wal1Err.message, wal1Err);

      const { error: wal2Err } = await realSupabaseClient.from("wallets").update({ balance: myWal.balance, drivecash_points: myWal.drivecash_points }).eq("id", myWal.id);
      if (wal2Err) console.error("[SUPABASE AUDIT ERROR] Failed to update my wallet:", wal2Err.message, wal2Err);

      const { error: txErr } = await realSupabaseClient.from("wallet_transactions").insert([tx1, tx2]);
      if (txErr) console.error("[SUPABASE AUDIT ERROR] Failed to insert referral transactions:", txErr.message, txErr);
    }

    this.broadcast();

    return { success: true, message: "Código aplicado! Você ganhou R$ 5,00 + 300 pontos DriveCash!" };
  }

  private postServerSync(endpoint: string, bodyData: any) {
    try {
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData)
      }).catch((e) => {
        // Non-blocking background error
      });
    } catch (e) {
      // Ignored
    }
  }
}

export const supabase = new SupabaseSimulatedClient();
