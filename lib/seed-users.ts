import { AVATAR_COLORS } from './constants';

export type SeedUserProfile = {
  username: string;
  name: string;
  email: string;
  mobile: string;
  city: string;
  country: string;
  bio: string;
  mutualFriends: number;
  avatarColor: string;
  goldCoins: number;
};

/** Demo accounts — searchable by username, safe to re-seed */
export const SEED_USER_PROFILES: SeedUserProfile[] = [
  {
    username: 'yusuf_a',
    name: 'Yusuf Ahmed',
    email: 'yusuf_a@addawah.dev',
    mobile: '+8801700000001',
    city: 'Dhaka',
    country: 'Bangladesh',
    bio: 'Dhaka · Fajr streak keeper',
    mutualFriends: 4,
    avatarColor: AVATAR_COLORS[1],
    goldCoins: 142,
  },
  {
    username: 'fatima_k',
    name: 'Fatima Khan',
    email: 'fatima_k@addawah.dev',
    mobile: '+8801700000002',
    city: 'Chittagong',
    country: 'Bangladesh',
    bio: 'Chittagong · Dawah circle',
    mutualFriends: 2,
    avatarColor: AVATAR_COLORS[5],
    goldCoins: 210,
  },
  {
    username: 'omar_h',
    name: 'Omar Hassan',
    email: 'omar_h@addawah.dev',
    mobile: '+8801700000003',
    city: 'Sylhet',
    country: 'Bangladesh',
    bio: 'Sylhet · Early riser',
    mutualFriends: 6,
    avatarColor: AVATAR_COLORS[2],
    goldCoins: 88,
  },
  {
    username: 'aisha_r',
    name: 'Aisha Rahman',
    email: 'aisha_r@addawah.dev',
    mobile: '+8801700000004',
    city: 'Rajshahi',
    country: 'Bangladesh',
    bio: 'Rajshahi · Quran study',
    mutualFriends: 1,
    avatarColor: AVATAR_COLORS[6],
    goldCoins: 320,
  },
  {
    username: 'ibrahim_m',
    name: 'Ibrahim Malik',
    email: 'ibrahim_m@addawah.dev',
    mobile: '+8801700000005',
    city: 'Khulna',
    country: 'Bangladesh',
    bio: 'Khulna · Brotherhood lead',
    mutualFriends: 3,
    avatarColor: AVATAR_COLORS[3],
    goldCoins: 56,
  },
];

export const SEED_USERNAMES = SEED_USER_PROFILES.map((p) => p.username);

/** Pre-linked as accepted friends when running db:seed */
export const SEED_FRIEND_USERNAMES = ['yusuf_a', 'omar_h', 'fatima_k', 'ibrahim_m'];

export const SEED_USER_PASSWORD = 'addawah123';

export function seedProfileByUsername(username: string) {
  return SEED_USER_PROFILES.find((p) => p.username === username);
}

export function isSeedUserEmail(email: string) {
  return email.endsWith('@addawah.dev');
}
