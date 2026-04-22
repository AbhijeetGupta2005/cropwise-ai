const STORAGE_KEY = "farmer-profile-v1";

const DEFAULT_PROFILE = {
  farmerName: "",
  farmName: "",
  region: "",
  defaultSeason: "",
  language: "English",
};

export function getFarmerProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveFarmerProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULT_PROFILE, ...profile }));
  } catch {}
}

export function clearFarmerProfile() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
