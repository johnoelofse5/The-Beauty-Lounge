'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { SignUpFormData } from '@/types/form';

export function useSignup() {
  const router = useRouter();
  const { signUpWithPhone, sendOTP } = useAuth();
  const { showError, showSuccess } = useToast();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [formData, setFormData] = useState<SignUpFormData>({
    phone: '',
    email: '',
    first_name: '',
    last_name: '',
    otp_code: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerHeight < window.screen.height * 0.75) {
        const activeElement = document.activeElement as HTMLElement;
        if (
          activeElement &&
          (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')
        ) {
          setTimeout(() => {
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    const inputs = document.querySelectorAll('input, textarea');
    const handleInputFocus = (e: Event) => {
      setTimeout(() => {
        const target = e.target as HTMLElement;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    };

    inputs.forEach((input) => input.addEventListener('focus', handleInputFocus));

    return () => {
      window.removeEventListener('resize', handleResize);
      inputs.forEach((input) => input.removeEventListener('focus', handleInputFocus));
    };
  }, [step]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^[\+]?[0-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    if (step === 'form') {
      if (!formData.phone) {
        setError('Phone number is required');
        return false;
      }
      if (!validatePhoneNumber(formData.phone)) {
        setError('Please enter a valid phone number (e.g., 0821234567)');
        return false;
      }
      if (!formData.email) {
        setError('Email address is required');
        return false;
      }
      if (!validateEmail(formData.email)) {
        setError('Please enter a valid email address');
        return false;
      }
      if (!formData.first_name) {
        setError('First name is required');
        return false;
      }
      if (!formData.last_name) {
        setError('Last name is required');
        return false;
      }
    } else if (step === 'otp') {
      if (!formData.otp_code) {
        setError('OTP code is required');
        return false;
      }
      if (!/^\d{6}$/.test(formData.otp_code)) {
        setError('OTP code must be 6 digits');
        return false;
      }
    }
    return true;
  };

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setError(null);
    try {
      await sendOTP(formData.phone, 'signup');
      showSuccess('OTP sent successfully! Please check your phone.');
      setOtpSent(true);
      setStep('otp');
      startCountdown();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send OTP';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setError(null);
    try {
      await signUpWithPhone(
        formData.phone,
        formData.email,
        formData.first_name,
        formData.last_name,
        formData.otp_code || ''
      );
      showSuccess('Account created successfully! Redirecting to login...');
      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to verify OTP and create account';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateForm()) return;
    if (step === 'form') {
      await handleSendOTP();
    } else {
      await handleVerifyOTP();
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    setLoading(true);
    setError(null);
    try {
      await sendOTP(formData.phone, 'signup');
      startCountdown();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return {
    step,
    setStep,
    formData,
    loading,
    error,
    success,
    otpSent,
    countdown,
    handleInputChange,
    handleSubmit,
    handleResendOTP,
  };
}
