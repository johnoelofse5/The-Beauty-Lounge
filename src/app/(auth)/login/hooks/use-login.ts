'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { SignInFormData } from '@/types/form';

export function useLogin() {
  const router = useRouter();
  const { signInWithPhone, sendOTP, signInWithGoogle } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [formData, setFormData] = useState<SignInFormData>({ phone: '', otp_code: '' });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartTimeRef = useRef<number | null>(null);

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

  const handleHoldStart = () => {
    holdStartTimeRef.current = Date.now();
    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - (holdStartTimeRef.current || 0);
      if (elapsed >= 5000) handleHoldComplete();
    }, 100);
  };

  const handleHoldEnd = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    holdStartTimeRef.current = null;
  };

  const handleHoldComplete = () => {
    handleHoldEnd();
    router.push('/legacy-login');
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^[\+]?[0-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateForm = (): boolean => {
    if (step === 'phone') {
      if (!formData.phone) {
        setError('Phone number is required');
        return false;
      }
      if (!validatePhoneNumber(formData.phone)) {
        setError('Please enter a valid phone number (e.g., 0821234567)');
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

  const checkAndRedirect = async (userId: string) => {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, phone')
      .eq('id', userId)
      .single();

    if (!profile?.phone || profile.phone.trim() === '') {
      router.push('/update-phone');
    } else {
      router.push('/');
    }
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          subscription.unsubscribe();
          const { data: existingProfile } = await supabase
            .from('users')
            .select('id')
            .eq('id', session.user.id)
            .single();
          if (!existingProfile) {
            await supabase
              .from('users')
              .insert({
                id: session.user.id,
                is_active: true,
                is_deleted: false,
                is_practitioner: false,
              });
          }
          await checkAndRedirect(session.user.id);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
      setGoogleLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setError(null);
    try {
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id, phone')
        .eq('phone', formData.phone)
        .maybeSingle();

      if (!existingUser) {
        setError('No account found with this phone number. Please sign up first.');
        setLoading(false);
        return;
      }

      await sendOTP(formData.phone, 'signin');
      setOtpSent(true);
      setStep('otp');
      startCountdown();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateForm()) return;
    setLoading(true);
    try {
      await signInWithPhone(formData.phone, formData.otp_code || '');
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) await checkAndRedirect(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    setLoading(true);
    setError(null);
    try {
      await sendOTP(formData.phone, 'signin');
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
    googleLoading,
    error,
    otpSent,
    countdown,
    handleInputChange,
    handleHoldStart,
    handleHoldEnd,
    handleGoogleSignIn,
    handleSendOTP,
    handleSubmit,
    handleResendOTP,
  };
}
