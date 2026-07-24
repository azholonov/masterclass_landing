export const registrationStatuses = ["new", "confirmed", "cancelled", "next_run"] as const;
export const paymentStatuses = ["unpaid", "partial", "paid", "refunded"] as const;
export const instructionsStatuses = ["not_sent", "sent", "acknowledged"] as const;
export const contactStatuses = ["not_contacted", "contacted", "replied"] as const;
export const attendanceStatuses = ["pending", "attended", "no_show"] as const;

export type RegistrationStatus = (typeof registrationStatuses)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];
export type InstructionsStatus = (typeof instructionsStatuses)[number];
export type ContactStatus = (typeof contactStatuses)[number];
export type AttendanceStatus = (typeof attendanceStatuses)[number];

export type Participant = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  contact: string;
  telegram: string | null;
  telegram_chat_id: number | null;
  workshop: string;
  source: string;
  status: RegistrationStatus;
  payment_status: PaymentStatus;
  payment_amount: number;
  paid_at: string | null;
  instructions_status: InstructionsStatus;
  instructions_sent_at: string | null;
  contact_status: ContactStatus;
  last_contacted_at: string | null;
  attendance_status: AttendanceStatus;
  next_action: string;
  notes: string;
};

export const participantSelect = [
  "id", "created_at", "updated_at", "name", "contact", "telegram",
  "telegram_chat_id", "workshop", "source", "status", "payment_status",
  "payment_amount", "paid_at", "instructions_status", "instructions_sent_at",
  "contact_status", "last_contacted_at", "attendance_status", "next_action", "notes",
].join(",");
