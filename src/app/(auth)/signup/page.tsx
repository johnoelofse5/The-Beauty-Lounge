'use client';

import { useSignup } from './hooks/use-signup';
import SignupForm from './components/signup-form';

export default function SignUpPage() {
  const {
    step,
    setStep,
    formData,
    loading,
    error,
    success,
    countdown,
    handleInputChange,
    handleSubmit,
    handleResendOTP,
  } = useSignup();

  const formProps = {
    step,
    formData,
    loading,
    error,
    countdown,
    onInputChange: handleInputChange,
    onSubmit: handleSubmit,
    onResendOTP: handleResendOTP,
    onChangeDetails: () => setStep('form'),
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div className="text-center bg-white rounded-lg shadow-sm p-6 sm:p-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Account Created!</h2>
            <p className="mt-3 text-sm text-gray-600 sm:text-base">
              Your account has been created successfully. You can now sign in.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        <div className="w-[70%] bg-gradient-to-br from-[#F2C7EB] to-[#E8A8D8] flex items-center justify-center">
          <div className="w-100 h-100 mx-auto mb-4">
            <img
              src="/assets/the beauty lounge logo.png"
              alt="The Beauty Lounge Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="w-[30%] flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
              <p className="mt-2 text-sm text-gray-600">Sign up with your mobile number</p>
            </div>
            <SignupForm {...formProps} />
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full max-w-md mx-auto space-y-6 sm:space-y-8">
          <div className="text-center pt-8">
            <div className="w-40 h-40 mx-auto mb-4">
              <img
                src="/assets/the beauty lounge logo.png"
                alt="The Beauty Lounge Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
            <p className="mt-2 text-sm text-gray-600">Sign up with your mobile number</p>
          </div>

          <SignupForm {...formProps} />
        </div>
      </div>
    </div>
  );
}
