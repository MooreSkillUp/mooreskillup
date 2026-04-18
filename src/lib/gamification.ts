// Gamification: points, streaks, badges, leaderboard — all client-side mock data.
// Ready to swap with Django REST endpoints later (see README).

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: "flame" | "trophy" | "star" | "zap" | "award" | "target" | "crown" | "rocket";
  earned: boolean;
  earnedAt?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string;
  points: number;
  streak: number;
  isCurrentUser?: boolean;
}

export interface UserStats {
  points: number;
  streak: number;
  longestStreak: number;
  lessonsCompleted: number;
  quizzesPassed: number;
  certificatesEarned: number;
  rank: number;
}

export const userStats: UserStats = {
  points: 1840,
  streak: 6,
  longestStreak: 14,
  lessonsCompleted: 8,
  quizzesPassed: 3,
  certificatesEarned: 1,
  rank: 4,
};

export const badges: Badge[] = [
  { id: "b1", name: "First Steps", description: "Complete your first lesson", icon: "rocket", earned: true, earnedAt: "Jan 15" },
  { id: "b2", name: "Week Warrior", description: "Maintain a 7-day streak", icon: "flame", earned: false },
  { id: "b3", name: "Quiz Master", description: "Score 100% on a quiz", icon: "star", earned: true, earnedAt: "Feb 02" },
  { id: "b4", name: "Module Crusher", description: "Finish a complete module", icon: "trophy", earned: true, earnedAt: "Feb 10" },
  { id: "b5", name: "Speed Learner", description: "Complete 5 lessons in a day", icon: "zap", earned: false },
  { id: "b6", name: "Sharpshooter", description: "Pass 3 quizzes in a row", icon: "target", earned: true, earnedAt: "Feb 18" },
  { id: "b7", name: "Top 3", description: "Reach the top 3 on the leaderboard", icon: "crown", earned: false },
  { id: "b8", name: "Certified", description: "Earn your first certificate", icon: "award", earned: true, earnedAt: "Feb 22" },
];

export const leaderboard: LeaderboardEntry[] = [
  { rank: 1, userId: "u_99", name: "Sade Adeyemi", avatar: "SA", points: 3420, streak: 22 },
  { rank: 2, userId: "u_44", name: "Marcus Vega", avatar: "MV", points: 2980, streak: 15 },
  { rank: 3, userId: "u_22", name: "Lena Park", avatar: "LP", points: 2210, streak: 9 },
  { rank: 4, userId: "u_1", name: "Alex Moore", avatar: "AM", points: 1840, streak: 6, isCurrentUser: true },
  { rank: 5, userId: "u_18", name: "Tomi Bello", avatar: "TB", points: 1620, streak: 4 },
  { rank: 6, userId: "u_31", name: "Jane Cole", avatar: "JC", points: 1450, streak: 3 },
  { rank: 7, userId: "u_55", name: "Kai Tanaka", avatar: "KT", points: 1230, streak: 8 },
  { rank: 8, userId: "u_77", name: "Priya Nair", avatar: "PN", points: 1080, streak: 2 },
  { rank: 9, userId: "u_61", name: "David Okafor", avatar: "DO", points: 940, streak: 5 },
  { rank: 10, userId: "u_88", name: "Amara Diallo", avatar: "AD", points: 820, streak: 1 },
];

// Last 7 days of activity for streak visualization
export const streakHistory: { day: string; active: boolean }[] = [
  { day: "Mon", active: true },
  { day: "Tue", active: true },
  { day: "Wed", active: true },
  { day: "Thu", active: false },
  { day: "Fri", active: true },
  { day: "Sat", active: true },
  { day: "Sun", active: true },
];
