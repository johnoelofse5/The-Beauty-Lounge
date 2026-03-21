'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  getServicesWithCategories,
  getCategories,
  getServiceOptions,
  createServiceOption,
  updateServiceOption,
  deleteServiceOption,
} from '@/lib/services';
import { ServiceWithCategory, Category, ServiceFormData, CategoryFormData } from '@/types';
import { ServiceOption, ServiceOptionFormData } from '@/types/service-option';
import { supabase } from '@/lib/supabase';
import { ValidationService } from '@/lib/validation-service';

export function useServices() {
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  const [services, setServices] = useState<ServiceWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showServiceDetails, setShowServiceDetails] = useState(false);
  const [editingService, setEditingService] = useState<ServiceWithCategory | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [viewingService, setViewingService] = useState<ServiceWithCategory | null>(null);

  const [isServiceModalClosing, setIsServiceModalClosing] = useState(false);
  const [isCategoryModalClosing, setIsCategoryModalClosing] = useState(false);
  const [isServiceDetailsClosing, setIsServiceDetailsClosing] = useState(false);

  const [serviceForm, setServiceForm] = useState<ServiceFormData>({
    name: '',
    description: '',
    duration_minutes: 30,
    price: 0,
    category_id: '',
  });

  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    name: '',
    description: '',
    display_order: 0,
  });

  const [serviceFormErrors, setServiceFormErrors] = useState<{ [key: string]: string }>({});
  const [categoryFormErrors, setCategoryFormErrors] = useState<{ [key: string]: string }>({});

  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [optionsService, setOptionsService] = useState<ServiceWithCategory | null>(null);
  const [serviceOptionsList, setServiceOptionsList] = useState<ServiceOption[]>([]);
  const [editingOption, setEditingOption] = useState<ServiceOption | null>(null);
  const [optionForm, setOptionForm] = useState<ServiceOptionFormData>({
    name: '',
    description: '',
    price_adjustment: 0,
    duration_adjustment_minutes: 0,
    display_order: 0,
  });
  const [showOptionForm, setShowOptionForm] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [servicesData, categoriesData] = await Promise.all([
        getServicesWithCategories(),
        getCategories(),
      ]);
      setServices(servicesData);
      setCategories(categoriesData);
    } catch (err) {
      showError('Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  //#region Options Modal
  const openOptionsModal = async (service: ServiceWithCategory) => {
    setOptionsService(service);
    setShowOptionsModal(true);
    setShowOptionForm(false);
    setEditingOption(null);
    setOptionForm({
      name: '',
      description: '',
      price_adjustment: 0,
      duration_adjustment_minutes: 0,
      display_order: 0,
    });
    setOptionsLoading(true);
    try {
      const opts = await getServiceOptions(service.id);
      setServiceOptionsList(opts);
    } catch {
      showError('Failed to load service options');
    } finally {
      setOptionsLoading(false);
    }
  };

  const closeOptionsModal = () => {
    setShowOptionsModal(false);
    setOptionsService(null);
    setServiceOptionsList([]);
    setEditingOption(null);
    setShowOptionForm(false);
  };

  const handleSaveOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!optionsService) return;
    try {
      if (editingOption) {
        const updated = await updateServiceOption(editingOption.id, optionForm);
        if (updated)
          setServiceOptionsList((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      } else {
        const created = await createServiceOption(optionsService.id, {
          ...optionForm,
          display_order: serviceOptionsList.length,
        });
        if (created) setServiceOptionsList((prev) => [...prev, created]);
      }
      setShowOptionForm(false);
      setEditingOption(null);
      setOptionForm({
        name: '',
        description: '',
        price_adjustment: 0,
        duration_adjustment_minutes: 0,
        display_order: 0,
      });
      showSuccess(editingOption ? 'Option updated' : 'Option added');
    } catch {
      showError('Failed to save option');
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    if (!confirm('Delete this option?')) return;
    try {
      await deleteServiceOption(optionId);
      setServiceOptionsList((prev) => prev.filter((o) => o.id !== optionId));
      showSuccess('Option deleted');
    } catch {
      showError('Failed to delete option');
    }
  };

  const handleEditOption = (option: ServiceOption) => {
    setEditingOption(option);
    setOptionForm({
      name: option.name,
      description: option.description || '',
      price_adjustment: option.price_adjustment,
      duration_adjustment_minutes: option.duration_adjustment_minutes,
      display_order: option.display_order,
    });
    setShowOptionForm(true);
  };

  //#endregion

  //#region Service Modal
  const closeServiceDetails = () => {
    setIsServiceDetailsClosing(true);
    setTimeout(() => {
      setShowServiceDetails(false);
      setViewingService(null);
      setIsServiceDetailsClosing(false);
    }, 300);
  };

  const closeServiceModal = () => {
    setIsServiceModalClosing(true);
    setTimeout(() => {
      setShowServiceModal(false);
      setEditingService(null);
      resetServiceForm();
      setIsServiceModalClosing(false);
    }, 300);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateServiceForm()) {
      return;
    }

    try {
      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update({
            name: serviceForm.name,
            description: serviceForm.description,
            duration_minutes: serviceForm.duration_minutes,
            price: serviceForm.price,
            category_id: serviceForm.category_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingService.id);

        if (error) throw error;
        showSuccess('Service updated successfully');
      } else {
        const { error } = await supabase.from('services').insert([
          {
            name: serviceForm.name,
            description: serviceForm.description,
            duration_minutes: serviceForm.duration_minutes,
            price: serviceForm.price,
            category_id: serviceForm.category_id,
            is_active: true,
            is_deleted: false,
          },
        ]);

        if (error) throw error;
        showSuccess('Service created successfully');
      }

      setShowServiceModal(false);
      setEditingService(null);
      resetServiceForm();
      loadData();
    } catch (err) {
      showError('Failed to save service');
      console.error('Error saving service:', err);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      const { error } = await supabase
        .from('services')
        .update({ is_deleted: true, is_active: false })
        .eq('id', serviceId);

      if (error) throw error;
      showSuccess('Service deleted successfully');
      loadData();
    } catch (err) {
      showError('Failed to delete service');
      console.error('Error deleting service:', err);
    }
  };

  const handleViewService = (service: ServiceWithCategory) => {
    setViewingService(service);
    setShowServiceDetails(true);
  };

  const handleEditService = (service: ServiceWithCategory) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description || '',
      duration_minutes: service.duration_minutes,
      price: service.price || 0,
      category_id: service.category_id || '',
    });
    setShowServiceModal(true);
  };

  const resetServiceForm = () => {
    setServiceForm({
      name: '',
      description: '',
      duration_minutes: 30,
      price: 0,
      category_id: '',
    });
    setServiceFormErrors({});
  };

  const validateServiceForm = (): boolean => {
    const result = ValidationService.validateForm(serviceForm, ValidationService.schemas.service);
    setServiceFormErrors(result.errors);
    return result.isValid;
  };

  //#endregion

  //#region Category Modal
  const closeCategoryModal = () => {
    setIsCategoryModalClosing(true);
    setTimeout(() => {
      setShowCategoryModal(false);
      setEditingCategory(null);
      resetCategoryForm();
      setIsCategoryModalClosing(false);
    }, 300);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCategoryForm()) {
      return;
    }

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('service_categories')
          .update({
            name: categoryForm.name,
            description: categoryForm.description,
            display_order: categoryForm.display_order,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        showSuccess('Category updated successfully');
      } else {
        const { error } = await supabase.from('service_categories').insert([
          {
            name: categoryForm.name,
            description: categoryForm.description,
            display_order: categoryForm.display_order,
            color: '#6366f1',
            is_active: true,
            is_deleted: false,
          },
        ]);

        if (error) throw error;
        showSuccess('Category created successfully');
      }

      setShowCategoryModal(false);
      setEditingCategory(null);
      resetCategoryForm();
      loadData();
    } catch (err) {
      showError('Failed to save category');
      console.error('Error saving category:', err);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this category? Services in this category will become uncategorized.'
      )
    )
      return;

    try {
      const { error } = await supabase
        .from('service_categories')
        .update({ is_deleted: true, is_active: false })
        .eq('id', categoryId);

      if (error) throw error;
      showSuccess('Category deleted successfully');
      loadData();
    } catch (err) {
      showError('Failed to delete category');
      console.error('Error deleting category:', err);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      display_order: category.display_order,
    });
    setShowCategoryModal(true);
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      display_order: categories.length,
    });
    setCategoryFormErrors({});
  };

  const validateCategoryForm = (): boolean => {
    const result = ValidationService.validateForm(categoryForm, ValidationService.schemas.category);
    setCategoryFormErrors(result.errors);
    return result.isValid;
  };

  //#endregion

  return {
    // data
    services,
    categories,
    loading,
    authLoading,
    user,
    // service modal
    showServiceModal,
    setShowServiceModal,
    showCategoryModal,
    setShowCategoryModal,
    showServiceDetails,
    editingService,
    setEditingService,
    editingCategory,
    setEditingCategory,
    viewingService,
    isServiceModalClosing,
    isCategoryModalClosing,
    isServiceDetailsClosing,
    serviceForm,
    setServiceForm,
    categoryForm,
    setCategoryForm,
    serviceFormErrors,
    setServiceFormErrors,
    categoryFormErrors,
    setCategoryFormErrors,
    // options modal
    showOptionsModal,
    optionsService,
    serviceOptionsList,
    editingOption,
    optionForm,
    setOptionForm,
    showOptionForm,
    setShowOptionForm,
    setEditingOption,
    optionsLoading,
    // handlers
    loadData,
    openOptionsModal,
    closeOptionsModal,
    handleSaveOption,
    handleDeleteOption,
    handleEditOption,
    closeServiceDetails,
    closeServiceModal,
    closeCategoryModal,
    handleSaveService,
    handleDeleteService,
    handleViewService,
    handleEditService,
    resetServiceForm,
    handleSaveCategory,
    handleDeleteCategory,
    handleEditCategory,
    resetCategoryForm,
  };
}
