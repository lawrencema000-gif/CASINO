export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type GameType =
  | "blackjack"
  | "slots"
  | "roulette"
  | "dice"
  | "mines"
  | "crash"
  | "plinko"
  | "keno"
  | "limbo"
  | "hilo";

export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "bet"
  | "win"
  | "bonus";

export type VipTier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          balance: number;
          total_wagered: number;
          total_won: number;
          level: number;
          exp: number;
          vip_tier: VipTier;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          balance?: number;
          total_wagered?: number;
          total_won?: number;
          level?: number;
          exp?: number;
          vip_tier?: VipTier;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          balance?: number;
          total_wagered?: number;
          total_won?: number;
          level?: number;
          exp?: number;
          vip_tier?: VipTier;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      games: {
        Row: {
          id: string;
          player_id: string;
          game_type: GameType;
          bet_amount: number;
          server_seed_hash: string;
          client_seed: string;
          nonce: number;
          result: Json;
          payout: number;
          multiplier: number;
          settled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          game_type: GameType;
          bet_amount: number;
          server_seed_hash: string;
          client_seed: string;
          nonce?: number;
          result?: Json;
          payout?: number;
          multiplier?: number;
          settled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          game_type?: GameType;
          bet_amount?: number;
          server_seed_hash?: string;
          client_seed?: string;
          nonce?: number;
          result?: Json;
          payout?: number;
          multiplier?: number;
          settled?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "games_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      transactions: {
        Row: {
          id: string;
          player_id: string;
          type: TransactionType;
          amount: number;
          balance_after: number;
          game_id: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          type: TransactionType;
          amount: number;
          balance_after: number;
          game_id?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          type?: TransactionType;
          amount?: number;
          balance_after?: number;
          game_id?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          }
        ];
      };
      jackpots: {
        Row: {
          id: string;
          game_type: GameType;
          pool_amount: number;
          rake_bps: number;
          last_winner_id: string | null;
          last_payout: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          game_type: GameType;
          pool_amount?: number;
          rake_bps?: number;
          last_winner_id?: string | null;
          last_payout?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          game_type?: GameType;
          pool_amount?: number;
          rake_bps?: number;
          last_winner_id?: string | null;
          last_payout?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jackpots_last_winner_id_fkey";
            columns: ["last_winner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      daily_bonuses: {
        Row: {
          id: string;
          player_id: string;
          day_streak: number;
          last_claimed: string;
          bonus_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          day_streak?: number;
          last_claimed?: string;
          bonus_amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          day_streak?: number;
          last_claimed?: string;
          bonus_amount?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_bonuses_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      game_type: GameType;
      transaction_type: TransactionType;
      vip_tier: VipTier;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier usage
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Game = Database["public"]["Tables"]["games"]["Row"];
export type GameInsert = Database["public"]["Tables"]["games"]["Insert"];
export type GameUpdate = Database["public"]["Tables"]["games"]["Update"];

export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];

export type Jackpot = Database["public"]["Tables"]["jackpots"]["Row"];
export type DailyBonus = Database["public"]["Tables"]["daily_bonuses"]["Row"];
