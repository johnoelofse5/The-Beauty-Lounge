'use client';

import { useLogin } from './hooks/use-login';
import LoginForm from './components/login-form';

export default function LoginPage() {
  const {
    step,
    setStep,
    formData,
    loading,
    googleLoading,
    error,
    countdown,
    handleInputChange,
    handleHoldStart,
    handleHoldEnd,
    handleGoogleSignIn,
    handleSendOTP,
    handleSubmit,
    handleResendOTP,
  } = useLogin();

  const formProps = {
    step,
    formData,
    loading,
    googleLoading,
    error,
    countdown,
    onInputChange: handleInputChange,
    onGoogleSignIn: handleGoogleSignIn,
    onSendOTP: handleSendOTP,
    onSubmit: handleSubmit,
    onResendOTP: handleResendOTP,
    onChangePhone: () => setStep('phone'),
  };

  const holdProps = {
    onMouseDown: handleHoldStart,
    onMouseUp: handleHoldEnd,
    onMouseLeave: handleHoldEnd,
    onTouchStart: handleHoldStart,
    onTouchEnd: handleHoldEnd,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        <div
          className="w-[70%] flex items-center justify-center"
          style={{ backgroundColor: '#FAE8F5' }}
        >
          <div className="w-100 h-100">
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
              <h2 className="text-3xl font-bold text-gray-900" {...holdProps}>
                Sign In
              </h2>
              <p className="mt-2 text-sm text-gray-600">Sign in with your mobile number</p>
            </div>
            <LoginForm {...formProps} />
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full max-w-md mx-auto space-y-6 sm:space-y-8">
          <div className="w-40 h-40 mx-auto mb-4">
            <img
              src="/assets/the beauty lounge logo.png"
              alt="The Beauty Lounge Logo"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900" {...holdProps}>
              Sign In
            </h2>
            <p className="mt-2 text-sm text-gray-600">Sign in with your mobile number</p>
          </div>

          <LoginForm {...formProps} />
        </div>
      </div>
    </div>
  );
}
