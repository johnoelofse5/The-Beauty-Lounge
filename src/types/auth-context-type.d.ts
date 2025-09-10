import { SupabaseUser } from "@supabase/supabase-js";
import { Session } from "@supabase/supabase-js";
import { UserSignUpData } from "@/types/user-sign-up-data";
import { UserWithRoleAndPermissions } from "@/lib/rbac";

export interface AuthContextType {
    user: SupabaseUser | null;
    session: Session | null;
    loading: boolean;
    userRoleData: UserWithRoleAndPermissions | null;
    signUp: (email: string, password: string, userData?: UserSignUpData) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
  }