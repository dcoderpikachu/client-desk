export type ClientStatus = "active" | "paused" | "churned";
export type EngagementType = "retainer" | "hourly" | "fixed";
export type Channel = "direct" | "upwork";

export type Client = {
  id: string;
  name: string;
  legal_name: string | null;
  country: string | null;
  billing_currency: string;
  payment_terms_days: number;
  status: ClientStatus;
  client_since: string | null;
  cadence_days: number;
  cadence_note: string | null;
  asana_url: string | null;
  upwork_name: string | null;
  created_at: string;
};

export type Brand = { id: string; client_id: string; name: string; store_url: string | null };

export type Contact = {
  id: string;
  client_id: string;
  name: string;
  role: string | null;
  email: string | null;
  is_primary: boolean;
};

export type Engagement = {
  id: string;
  client_id: string;
  title: string | null;
  type: EngagementType;
  channel: Channel;
  upwork_contract_id: string | null;
  currency: string;
  monthly_value: number | null;
  hourly_rate: number | null;
  total_value: number | null;
  start_date: string | null;
  end_date: string | null;
  status: "active" | "ended";
};

export type Touchpoint = {
  id: string;
  client_id: string;
  occurred_on: string;
  type: "call" | "meeting" | "async";
  sentiment: "good" | "neutral" | "concerned" | null;
  summary: string | null;
  created_at: string;
};

export type ActionItem = {
  id: string;
  client_id: string;
  touchpoint_id: string | null;
  text: string;
  due_on: string | null;
  done_at: string | null;
  created_at: string;
};

export type Note = { id: string; client_id: string; body: string; created_at: string };

export type Rating = {
  id: string;
  client_id: string;
  rating: "green" | "amber" | "red";
  reason: string | null;
  created_at: string;
};

export type Invoice = {
  id: string;
  client_id: string;
  engagement_id: string | null;
  number: string;
  currency: string;
  amount: number;
  issued_on: string;
  due_on: string;
  status: "sent" | "partially_paid" | "paid" | "void";
  paid_on: string | null;
  amount_received_inr: number | null;
};

export type Payout = {
  id: string;
  paid_on: string;
  usd_withdrawn: number;
  inr_received: number | null;
  source_ref: string | null;
  note: string | null;
};

export type Earning = {
  id: string;
  client_id: string;
  engagement_id: string | null;
  kind: "hourly" | "milestone" | "bonus";
  period_start: string | null;
  period_end: string;
  hours: number | null;
  gross_usd: number;
  fee_usd: number;
  net_usd: number;
  status: "pending" | "available" | "withdrawn";
  payout_id: string | null;
  txn_date: string | null;
  description: string | null;
};

export type Charge = {
  id: string;
  occurred_on: string;
  kind: "membership" | "connects" | "withdrawal_fee" | "other";
  amount_usd: number;
  description: string | null;
  payout_id: string | null;
};

export type Thresholds = {
  concentration: number;
  payment_amber_days: number;
  payment_red_days: number;
  trend_amber_drop: number;
  trend_red_drop: number;
  trend_quiet_days: number;
  rating_stale_days: number;
};

export const DEFAULT_THRESHOLDS: Thresholds = {
  concentration: 0.3,
  payment_amber_days: 1,
  payment_red_days: 31,
  trend_amber_drop: 0.3,
  trend_red_drop: 0.6,
  trend_quiet_days: 14,
  rating_stale_days: 30,
};
