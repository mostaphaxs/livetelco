export type SiteKind = "teleport" | "tower" | "future";

export interface Site {
  city: string;
  country: string;
  lat: number;
  lon: number;
  kind: SiteKind;
}

export const HQ = { city: "Sharjah", country: "UAE", lat: 25.33, lon: 55.39 };

export const SITES: Site[] = [
  // Teleports in operation
  { city: "Dammam", country: "Saudi Arabia", lat: 26.43, lon: 50.1, kind: "teleport" },
  { city: "Riyadh", country: "Saudi Arabia", lat: 24.71, lon: 46.68, kind: "teleport" },
  { city: "Ras Al Khaimah", country: "UAE", lat: 25.79, lon: 55.94, kind: "teleport" },
  { city: "Al Ain", country: "UAE", lat: 24.21, lon: 55.74, kind: "teleport" },
  { city: "Borg El Arab", country: "Egypt", lat: 30.92, lon: 29.54, kind: "teleport" },
  { city: "Suez", country: "Egypt", lat: 29.97, lon: 32.55, kind: "teleport" },
  { city: "Sadat", country: "Egypt", lat: 30.37, lon: 30.53, kind: "teleport" },
  { city: "Assiut", country: "Egypt", lat: 27.18, lon: 31.18, kind: "teleport" },
  { city: "Abuja", country: "Nigeria", lat: 9.07, lon: 7.4, kind: "teleport" },
  { city: "Ilorin", country: "Nigeria", lat: 8.5, lon: 4.55, kind: "teleport" },
  { city: "Kumasi", country: "Ghana", lat: 6.69, lon: -1.62, kind: "teleport" },
  { city: "Pamdu", country: "Ghana", lat: 7.95, lon: -1.95, kind: "teleport" },
  // Towers
  { city: "Vavatsinia", country: "Cyprus", lat: 34.88, lon: 33.38, kind: "tower" },
  { city: "Bakkish", country: "Lebanon", lat: 33.95, lon: 35.8, kind: "tower" },
  // Future teleports
  { city: "Jeddah", country: "Saudi Arabia", lat: 21.49, lon: 39.19, kind: "future" },
  { city: "Tabuk", country: "Saudi Arabia", lat: 28.38, lon: 36.57, kind: "future" },
  { city: "Al Qassim", country: "Saudi Arabia", lat: 26.2, lon: 43.5, kind: "future" },
  { city: "Buraydah", country: "Saudi Arabia", lat: 26.33, lon: 43.97, kind: "future" },
  { city: "Ibadan", country: "Nigeria", lat: 7.38, lon: 3.95, kind: "future" },
  { city: "Lagos", country: "Nigeria", lat: 6.52, lon: 3.38, kind: "future" },
  { city: "Nador", country: "Morocco", lat: 35.17, lon: -2.93, kind: "future" },
  { city: "Dakar", country: "Senegal", lat: 14.72, lon: -17.47, kind: "future" },
  { city: "Kazimzumbwi", country: "Tanzania", lat: -6.95, lon: 39.05, kind: "future" },
  { city: "Kinshasa", country: "DR Congo", lat: -4.44, lon: 15.27, kind: "future" },
  { city: "Oslo", country: "Norway", lat: 59.91, lon: 10.75, kind: "future" },
  { city: "Zagreb", country: "Croatia", lat: 45.81, lon: 15.98, kind: "future" },
  { city: "Karachi", country: "Pakistan", lat: 24.86, lon: 67.0, kind: "future" },
];

export const KIND_META: Record<SiteKind, { label: string; color: string; hex: number }> = {
  teleport: { label: "Teleports", color: "#f5a524", hex: 0xf5a524 },
  tower: { label: "Towers", color: "#34d399", hex: 0x34d399 },
  future: { label: "Future teleports", color: "#60a5fa", hex: 0x60a5fa },
};
