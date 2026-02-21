"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getServicesWithCategories } from "@/lib/services";
import { supabase } from "@/lib/supabase";
import { isPractitioner } from "@/lib/rbac";
import { ValidationService } from "@/lib/validation-service";
import {
    BookingProgressService,
    BookingProgress,
} from "@/lib/booking-progress-service";
import { AppointmentSMSService } from "@/lib/appointment-sms-service";
import { AppointmentCalendarService } from "@/lib/appointment-calendar-service";
import { InventoryService } from "@/lib/inventory-service";
import { ScheduleService } from "@/lib/schedule-service";
import { ServiceWithCategory } from "@/types";
import { Practitioner } from "@/types/practitioner";
import { Client } from "@/types/client";
import { BookingStep } from "@/types/booking-step";

export function useAppointmentBooking() {
    const { user, userRoleData, loading: authLoading } = useAuth();
    const { showSuccess, showError } = useToast();
    const router = useRouter();

    //#region Data
    const [services, setServices] = useState<ServiceWithCategory[]>([]);
    const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    //#endregion

    //#region Selection State
    const [selectedServices, setSelectedServices] = useState<ServiceWithCategory[]>([]);
    const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(null);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedTime, setSelectedTime] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [blockedDates, setBlockedDates] = useState<string[]>([]);
    const [sendClientSMS, setSendClientSMS] = useState(true);
    //#endregion

    //#region External Client
    const [isExternalClient, setIsExternalClient] = useState<boolean>(false);
    const [externalClientInfo, setExternalClientInfo] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
    });
    const [externalClientFormErrors, setExternalClientFormErrors] = useState<Record<string, string>>({});
    //#endregion

    //#region Step / Progress
    const [bookingStep, setBookingStep] = useState<BookingStep>("service");
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [hasSavedProgress, setHasSavedProgress] = useState<boolean>(false);
    const [savingProgress, setSavingProgress] = useState<boolean>(false);
    const [progressLoaded, setProgressLoaded] = useState<boolean>(false);
    const [savedServiceIds, setSavedServiceIds] = useState<string[]>([]);
    const [savedPractitionerId, setSavedPractitionerId] = useState<string | null>(null);
    const [savedClientId, setSavedClientId] = useState<string | null>(null);
    //#endregion

    //#region UI State
    const [isBooking, setIsBooking] = useState(false);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [showFloatingPill, setShowFloatingPill] = useState(true);
    const [existingAppointments, setExistingAppointments] = useState<any[]>([]);
    const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());
    const observerRef = useRef<IntersectionObserver | null>(null);
    //#endregion

    //#region Derived
    const isPractitionerUser = isPractitioner(userRoleData?.role || null);
    const isSuperAdmin = userRoleData?.role?.name === "super_admin";
    const allowSameDayBooking = isPractitionerUser || isSuperAdmin;
    const canControlClientSMS = isPractitionerUser || isSuperAdmin;
    //#endregion

    //#region Helpers
    const getTomorrowDate = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today;
    };

    const getMaxDate = () => {
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 3);
        return maxDate;
    };

    const formatDateForAPI = (date: Date | undefined) => {
        if (!date) return "";
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const formatTimeDisplay = (time: string): string => {
        if (!time) return "";
        const [hours, minutes] = time.split(":").map(Number);
        const period = hours >= 12 ? "PM" : "AM";
        const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
        return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
    };

    const updateCurrentStep = (step: BookingStep) => {
        setBookingStep(step);
        const stepMap = { service: 1, practitioner: 2, client: 2, datetime: 3, confirm: 4 };
        setCurrentStep(stepMap[step]);
    };
    //#endregion

    //#region Data loaders
    const loadServices = async () => {
        try {
            setLoading(true);
            const data = await getServicesWithCategories();
            setServices(data);
        } catch {
            showError("Failed to load services");
        } finally {
            setLoading(false);
        }
    };

    const loadPractitioners = async () => {
        try {
            const { data, error } = await supabase
                .from("users")
                .select("id, first_name, last_name, email, phone")
                .eq("is_practitioner", true)
                .eq("is_active", true)
                .eq("is_deleted", false)
                .order("first_name", { ascending: true });
            if (error) throw error;
            setPractitioners(data || []);
            if (data && data.length === 1) setSelectedPractitioner(data[0]);
        } catch {
            showError("Failed to load practitioners");
        }
    };

    const loadClients = async () => {
        try {
            const { data, error } = await supabase
                .from("users")
                .select("id, first_name, last_name, email, phone")
                .eq("is_practitioner", false)
                .eq("is_active", true)
                .eq("is_deleted", false)
                .order("first_name", { ascending: true });
            if (error) throw error;
            setClients(data || []);
        } catch {
            showError("Failed to load clients");
        }
    };

    const loadExistingAppointments = useCallback(async () => {
        if (!selectedDate || !selectedPractitioner) {
            setExistingAppointments([]);
            return;
        }
        try {
            setLoadingSlots(true);
            setExistingAppointments([]);
            const dateStr = formatDateForAPI(selectedDate);
            const { data, error } = await supabase
                .from("appointments")
                .select("start_time, end_time")
                .gte("appointment_date", `${dateStr}T00:00:00`)
                .lt("appointment_date", `${dateStr}T23:59:59`)
                .eq("practitioner_id", selectedPractitioner.id)
                .eq("is_active", true)
                .eq("is_deleted", false);
            if (error) throw error;
            setExistingAppointments(data || []);
        } catch {
            setExistingAppointments([]);
        } finally {
            setLoadingSlots(false);
        }
    }, [selectedDate, selectedPractitioner]);

    //#enderegion

    //#region Progress persistence
    const restoreSelectedServices = () => {
        if (savedServiceIds.length > 0 && services.length > 0) {
            setSelectedServices(services.filter((s) => savedServiceIds.includes(s.id)));
        }
    };

    const restoreSelectedPractitioner = () => {
        if (savedPractitionerId && practitioners.length > 0 && !selectedPractitioner) {
            const p = practitioners.find((p) => p.id === savedPractitionerId);
            if (p) setSelectedPractitioner(p);
        }
    };

    const restoreSelectedClient = () => {
        if (savedClientId && clients.length > 0 && !selectedClient) {
            const c = clients.find((c) => c.id === savedClientId);
            if (c) setSelectedClient(c);
        }
    };

    const loadSavedProgress = async () => {
        if (!user || progressLoaded) return;
        try {
            const progress = await BookingProgressService.loadProgress(user.id);
            if (progress) {
                setCurrentStep(progress.current_step);
                setHasSavedProgress(true);
                setProgressLoaded(true);
                if (progress.selected_services) setSavedServiceIds(progress.selected_services);
                if (progress.selected_practitioner_id) setSavedPractitionerId(progress.selected_practitioner_id);
                if (progress.selected_client_id) setSavedClientId(progress.selected_client_id);
                if (progress.selected_date) setSelectedDate(new Date(progress.selected_date));
                if (progress.selected_time) setSelectedTime(progress.selected_time);
                if (progress.notes) setNotes(progress.notes);
                if (progress.is_external_client) {
                    setIsExternalClient(true);
                    if (progress.external_client_info) setExternalClientInfo(progress.external_client_info);
                }
                if (progress.current_step >= 4) updateCurrentStep("confirm");
                else if (progress.current_step >= 3) updateCurrentStep("datetime");
                else if (progress.current_step >= 2) updateCurrentStep(isPractitionerUser ? "client" : "practitioner");
                else updateCurrentStep("service");
            } else {
                setProgressLoaded(true);
            }
        } catch {
            setProgressLoaded(true);
        }
    };

    const saveProgress = async () => {
        if (!user || savingProgress) return;
        try {
            setSavingProgress(true);
            const progressData: Partial<BookingProgress> = {
                current_step: currentStep,
                selected_services: selectedServices.map((s) => s.id),
                selected_practitioner_id: selectedPractitioner?.id,
                selected_client_id: selectedClient?.id,
                selected_date: selectedDate ? formatDateForAPI(selectedDate) : undefined,
                selected_time: selectedTime || undefined,
                notes: notes || undefined,
                is_external_client: isExternalClient,
                external_client_info: isExternalClient ? externalClientInfo : undefined,
                practitioner_id: isPractitionerUser ? user.id : selectedPractitioner?.id,
            };
            await BookingProgressService.saveProgress(user.id, progressData);
            setHasSavedProgress(true);
        } catch {

        } finally {
            setSavingProgress(false);
        }
    };

    const clearProgress = async () => {
        if (!user) return;
        try {
            await BookingProgressService.clearProgress(user.id);
            setHasSavedProgress(false);
            setProgressLoaded(false);
            setSavedServiceIds([]);
            setSavedPractitionerId(null);
            setSavedClientId(null);
            showSuccess("Booking progress cleared!");
        } catch (error) {
            if (error instanceof Error && error.message.includes("No booking progress found")) {
                setHasSavedProgress(false);
                setProgressLoaded(false);
                showSuccess("No booking progress to clear");
            } else {
                showError("Failed to clear booking progress. Please try again.");
            }
        }
    };

    //#endregion

    //#region Step handlers
    const handleServiceSelect = (service: ServiceWithCategory) => {
        setSelectedServices((prev) =>
            prev.some((s) => s.id === service.id)
                ? prev.filter((s) => s.id !== service.id)
                : [...prev, service]
        );
    };

    const handleContinueToPractitioner = () => {
        if (selectedServices.length > 0) {
            updateCurrentStep(isPractitionerUser ? "client" : "practitioner");
        }
    };

    const handleContinueToDateTime = () => {
        if (isPractitionerUser) {
            if (selectedServices.length > 0 && selectedClient) {
                updateCurrentStep("datetime");
            } else if (isExternalClient) {
                const validationResult = ValidationService.validateForm(
                    externalClientInfo,
                    ValidationService.schemas.externalClient
                );
                if (validationResult.isValid) {
                    updateCurrentStep("datetime");
                } else {
                    setExternalClientFormErrors(validationResult.errors);
                }
            }
        } else {
            if (selectedServices.length > 0 && selectedPractitioner) {
                updateCurrentStep("datetime");
            }
        }
    };

    const handleDateTimeConfirm = () => {
        if (selectedDate && selectedTime) updateCurrentStep("confirm");
    };

    //#endregion

    //#region Booking submission
    const handleBookingConfirm = async () => {
        setIsBooking(true);

        if (isPractitionerUser) {
            if (!selectedClient && !isExternalClient) {
                showError("Please select a client or choose external client");
                setIsBooking(false);
                return;
            }
            if (isExternalClient) {
                if (!externalClientInfo.firstName.trim()) { showError("Please enter the client's first name"); setIsBooking(false); return; }
                if (!externalClientInfo.lastName.trim()) { showError("Please enter the client's last name"); setIsBooking(false); return; }
                if (!externalClientInfo.email.trim() && !externalClientInfo.phone.trim()) { showError("Please enter either email or phone number for the client"); setIsBooking(false); return; }
            }
        } else {
            if (!selectedPractitioner) { showError("Please select a practitioner"); setIsBooking(false); return; }
        }
        if (selectedServices.length === 0) { showError("Please select at least one service"); setIsBooking(false); return; }
        if (!selectedDate) { showError("Please select an appointment date"); setIsBooking(false); return; }
        if (!selectedTime) { showError("Please select an appointment time"); setIsBooking(false); return; }
        if (!user) { showError("User session expired. Please refresh the page"); setIsBooking(false); return; }

        try {
            const totalDuration = selectedServices.reduce((t, s) => t + s.duration_minutes, 0);
            const [hours, minutes] = selectedTime.split(":").map(Number);
            const endMins = hours * 60 + minutes + totalDuration;
            const endTimeString = `${Math.floor(endMins / 60).toString().padStart(2, "0")}:${(endMins % 60).toString().padStart(2, "0")}`;

            const appointmentData = {
                user_id: isPractitionerUser ? (isExternalClient ? null : selectedClient!.id) : user.id,
                practitioner_id: isPractitionerUser ? user.id : selectedPractitioner!.id,
                appointment_date: new Date(`${formatDateForAPI(selectedDate)}T${selectedTime}`).toISOString(),
                start_time: new Date(`${formatDateForAPI(selectedDate)}T${selectedTime}`).toISOString(),
                end_time: new Date(`${formatDateForAPI(selectedDate)}T${endTimeString}`).toISOString(),
                status: "scheduled",
                notes: notes || null,
                is_active: true,
                is_deleted: false,
                service_ids: selectedServices.map((s) => s.id),
                service_id: selectedServices[0]?.id || null,
                is_external_client: isPractitionerUser && isExternalClient,
                client_first_name: isPractitionerUser && isExternalClient ? externalClientInfo.firstName : null,
                client_last_name: isPractitionerUser && isExternalClient ? externalClientInfo.lastName : null,
                client_email: isPractitionerUser && isExternalClient ? externalClientInfo.email : null,
                client_phone: isPractitionerUser && isExternalClient ? externalClientInfo.phone : null,
            };

            const { data: inserted, error } = await supabase
                .from("appointments")
                .insert([appointmentData])
                .select()
                .single();

            if (error) throw error;
            if (!inserted) throw new Error("Failed to create appointment");

            try {
                await InventoryService.createFinancialTransaction(
                    {
                        transaction_type: "income" as const,
                        category: "service_revenue",
                        amount: selectedServices.reduce((s, svc) => s + (svc.price || 0), 0),
                        transaction_date: new Date().toISOString().split("T")[0],
                        payment_method: "Pending",
                        receipt_number: `APPT-${inserted.id}`,
                    },
                    user.id
                );
            } catch {
                showError("Appointment booked, but failed to record financial transaction");
            }

            try { await AppointmentSMSService.sendAppointmentNotifications(inserted.id, "confirmation", false, sendClientSMS); } catch { }

            try { await AppointmentCalendarService.createCalendarEvent(inserted.id); } catch { }

            showSuccess("Appointment booked successfully! Redirecting...");

            setSelectedServices([]);
            setSelectedPractitioner(practitioners.length === 1 ? practitioners[0] : null);
            setSelectedClient(null);
            setSelectedDate(undefined);
            setSelectedTime("");
            setNotes("");
            setIsExternalClient(false);
            setExternalClientInfo({ firstName: "", lastName: "", email: "", phone: "" });
            setExternalClientFormErrors({});
            setSavedServiceIds([]);
            setSavedPractitionerId(null);
            setSavedClientId(null);
            updateCurrentStep("service");
            await BookingProgressService.clearProgress(user.id);
            setHasSavedProgress(false);
            setProgressLoaded(false);

            setTimeout(() => router.push(isPractitionerUser ? "/appointments-management" : "/"), 2000);
        } catch {
            showError("Failed to book appointment. Please try again.");
        } finally {
            setIsBooking(false);
        }
    };
    //#endregion

    //#region Effects

    useEffect(() => {
        if (user) {
            loadServices();
            loadPractitioners();
            if (isPractitionerUser) loadClients();
        }
    }, [user, isPractitionerUser]);

    useEffect(() => {
        if (user) loadSavedProgress();
    }, [user]);

    useEffect(() => {
        if (services.length > 0 && hasSavedProgress && selectedServices.length === 0) restoreSelectedServices();
    }, [services, hasSavedProgress, selectedServices.length]);

    useEffect(() => {
        if (practitioners.length > 0 && hasSavedProgress && !selectedPractitioner) restoreSelectedPractitioner();
    }, [practitioners, hasSavedProgress, selectedPractitioner]);

    useEffect(() => {
        if (clients.length > 0 && hasSavedProgress && !selectedClient) restoreSelectedClient();
    }, [clients, hasSavedProgress, selectedClient]);

    useEffect(() => {
        if (user && currentStep > 1) saveProgress();
    }, [selectedServices, selectedPractitioner, selectedClient, selectedDate, selectedTime, notes, isExternalClient, externalClientInfo, currentStep]);

    useEffect(() => {
        if (selectedDate && selectedPractitioner) loadExistingAppointments();
        else setExistingAppointments([]);
    }, [selectedDate, selectedPractitioner, loadExistingAppointments]);

    useEffect(() => {
        const loadBlockedDates = async () => {
            if (!selectedPractitioner?.id) { setBlockedDates([]); return; }
            try {
                const blocked = await ScheduleService.getBlockedDates(selectedPractitioner.id);
                setBlockedDates(blocked);
            } catch { setBlockedDates([]); }
        };
        loadBlockedDates();
    }, [selectedPractitioner?.id]);

    useEffect(() => {
        if (bookingStep !== "service" || selectedServices.length === 0) { setShowFloatingPill(true); return; }
        const handleScroll = () => {
            const el = document.getElementById("selected-services-section");
            if (!el) { setShowFloatingPill(true); return; }
            const rect = el.getBoundingClientRect();
            setShowFloatingPill(!(rect.top <= window.innerHeight && rect.bottom >= 0));
        };
        window.addEventListener("scroll", handleScroll);
        handleScroll();
        return () => window.removeEventListener("scroll", handleScroll);
    }, [bookingStep, selectedServices.length]);

    useEffect(() => {
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const id = entry.target.getAttribute("data-animate-id");
                    if (id) {
                        setVisibleElements((prev) => {
                            const next = new Set(prev);
                            entry.isIntersecting ? next.add(id) : next.delete(id);
                            return next;
                        });
                    }
                });
            },
            { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
        );
        return () => observerRef.current?.disconnect();
    }, []);

    useEffect(() => {
        if (observerRef.current && !loading) {
            document.querySelectorAll("[data-animate-id]").forEach((el) => observerRef.current?.observe(el));
        }
    }, [loading, bookingStep]);

    //#endregion

    return {
        user, authLoading,
        services, practitioners, clients, loading,
        selectedServices, selectedPractitioner, selectedClient,
        selectedDate, selectedTime, notes, blockedDates,
        sendClientSMS, setSendClientSMS,
        isExternalClient, setIsExternalClient,
        externalClientInfo, setExternalClientInfo,
        externalClientFormErrors, setExternalClientFormErrors,
        bookingStep, currentStep, hasSavedProgress, savingProgress,
        isBooking, loadingSlots, showFloatingPill, existingAppointments, visibleElements,
        isPractitionerUser, isSuperAdmin, allowSameDayBooking, canControlClientSMS,
        handleServiceSelect,
        handleContinueToPractitioner,
        handleContinueToDateTime,
        handleDateTimeConfirm,
        handleBookingConfirm,
        setSelectedPractitioner,
        setSelectedClient,
        setSelectedDate: (date: Date | undefined) => { setSelectedDate(date); setSelectedTime(""); },
        setSelectedTime,
        setNotes,
        clearProgress,
        updateCurrentStep,
        getTomorrowDate, getMaxDate, formatTimeDisplay,
    };
}