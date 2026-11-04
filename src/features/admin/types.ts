export interface AdminProfile {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: "superadmin" | "admin";
  avatarUrl: string;
  phone: string;
  bio: string;
  authMethod: "google" | "password";
  pendingEmail?: string;
}
