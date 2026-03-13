export type Group = {
  id: string;
  name: string;
  subject_focus: string;
  max_members: number;
  join_code: string;
  created_by: string;
  created_at: string;
  description?: string;
  privacy?: string;
};

export type MemberWithStats = {
  user_id: string;
  joined_at: string;
  email?: string;
  display_name?: string;
  xp?: number;
  streak?: number;
  weekly_hours?: number;
  total_hours?: number;
  subjects_progress?: { name: string; code: string; progress: number }[];
};

export type Message = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  email?: string;
};

export type GroupNotification = {
  id: string;
  group_id: string;
  user_id: string;
  type: string;
  message: string;
  created_at: string;
};

export type GroupAssignment = {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  description: string;
  deadline: string | null;
  assigned_to: string[];
  created_at: string;
};

export type GroupAchievement = {
  id: string;
  group_id: string;
  badge_key: string;
  unlocked_at: string;
};

export const GROUP_BADGES = [
  { key: "group_10h", label: "10 Hours Together", description: "Group studied 10+ hours collectively", icon: "⏱️", threshold: 10 },
  { key: "group_50h", label: "50 Hour Squad", description: "Group studied 50+ hours collectively", icon: "🔥", threshold: 50 },
  { key: "group_100h", label: "Century Club", description: "Group studied 100+ hours collectively", icon: "💯", threshold: 100 },
  { key: "group_5_members", label: "Full House", description: "Group has 5+ members", icon: "👥", threshold: 5 },
  { key: "group_all_active", label: "All Active", description: "Every member studied this week", icon: "⚡", threshold: 1 },
];
