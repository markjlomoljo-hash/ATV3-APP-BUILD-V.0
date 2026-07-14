import type { AppRole } from "@/lib/auth/roles";

export {};

declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: AppRole;
      roleVersion?: number;
    };
  }

  interface UserPublicMetadata {
    role?: AppRole;
    roleVersion?: number;
  }

  interface UserPrivateMetadata {
    accountStatus?: "active" | "suspended" | "restricted";
    accountStatusReason?: string;
  }
}
