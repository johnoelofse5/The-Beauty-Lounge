import { SupabaseUser } from "@supabase/supabase-js";
import { Session } from "@supabase/supabase-js";
import { UserSignUpData } from "@/types/user-sign-up-data";
import { UserWithRoleAndPermissions } from "@/lib/rbac";

export interface AuthContextType {
    user: SupabaseUser | null;
    session: Session | null;
    loading: boolean;
    userRoleData: UserWithRoleAndPermissions | null;
    // Legacy email/password methods (deprecated)
    signUp: (email: string, password: string, userData?: UserSignUpData) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    // New mobile authentication methods
    signUpWithPhone: (phone: string, firstName: string, lastName: string, otpCode: string) => Promise<void>;
    signInWithPhone: (phone: string, otpCode: string) => Promise<void>;
    sendOTP: (phone: string, purpose: 'signup' | 'signin' | 'password_reset') => Promise<void>;
    verifyOTP: (phone: string, otpCode: string, purpose: 'signup' | 'signin' | 'password_reset') => Promise<boolean>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
  }