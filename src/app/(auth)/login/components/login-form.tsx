import Link from 'next/link';
import GoogleSignInButton from './google-sign-in-button';
import { SignInFormData } from '@/types/form';

interface LoginFormProps {
  step: 'phone' | 'otp';
  formData: SignInFormData;
  loading: boolean;
  googleLoading: boolean;
  error: string | null;
  countdown: number;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGoogleSignIn: () => void;
  onSendOTP: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onResendOTP: () => void;
  onChangePhone: () => void;
}

export default function LoginForm({
  step,
  formData,
  loading,
  googleLoading,
  error,
  countdown,
  onInputChange,
  onGoogleSignIn,
  onSendOTP,
  onSubmit,
  onResendOTP,
  onChangePhone,
}: LoginFormProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {step === 'phone' && (
        <>
          <GoogleSignInButton
            loading={googleLoading}
            disabled={googleLoading || loading}
            onClick={onGoogleSignIn}
          />
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-gray-500">Or continue with phone</span>
            </div>
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        {step === 'phone' && (
          <>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Mobile Number
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={onInputChange}
                  placeholder="0821234567"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter your mobile number (e.g., 0821234567)
              </p>
            </div>

            <button
              type="button"
              onClick={onSendOTP}
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </>
        )}

        {step === 'otp' && (
          <>
            <div>
              <label htmlFor="otp_code" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <div className="mt-1">
                <input
                  id="otp_code"
                  name="otp_code"
                  type="text"
                  required
                  maxLength={6}
                  value={formData.otp_code}
                  onChange={onInputChange}
                  placeholder="123456"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-center text-lg tracking-widest"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter the 6-digit code sent to {formData.phone}
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={onResendOTP}
                disabled={loading || countdown > 0}
                className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend'}
              </button>
            </div>

            <button
              type="button"
              onClick={onChangePhone}
              className="w-full text-sm text-indigo-600 hover:text-indigo-500"
            >
              Change phone number
            </button>
          </>
        )}
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Don't have an account?</span>
          </div>
        </div>
        <div className="mt-6">
          <Link
            href="/signup"
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
