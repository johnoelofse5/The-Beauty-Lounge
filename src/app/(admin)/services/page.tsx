'use client';

import Link from 'next/link';
import { formatPrice, formatDuration } from '@/lib/services';
import { useServices } from './hooks/use-services';
import ServiceModal from './components/service-modal';
import CategoryModal from './components/category-modal';
import ServiceDetailsModal from './components/service-details-modal';
import ServiceOptionsModal from './components/service-options-modal';

export default function AdminServicesPage() {
  const {
    services,
    categories,
    loading,
    authLoading,
    user,
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
  } = useServices();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">You must be logged in to access this page.</p>
          <Link href="/login" className="text-indigo-600 hover:text-indigo-500">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Buttons */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => {
              resetServiceForm();
              setEditingService(null);
              setShowServiceModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-900 bg-[#F2C7EB] hover:bg-[#E8A8D8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2C7EB]"
          >
            + Add New Service
          </button>
          <button
            onClick={() => {
              resetCategoryForm();
              setEditingCategory(null);
              setShowCategoryModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-900 bg-[#F6D5F0] hover:bg-[#F2C7EB] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2C7EB]"
          >
            + Add New Category
          </button>
        </div>

        {/* Categories Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Service Categories</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="text-[#F2C7EB] hover:text-[#E8A8D8] p-1 rounded hover:bg-gray-100"
                      title="Edit category"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-gray-100"
                      title="Delete category"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                {category.description && (
                  <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                )}
                <p className="text-xs text-gray-500">Order: {category.display_order}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Services Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Services</h2>

          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {services.map((service) => (
                      <tr key={service.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{service.name}</div>
                            {service.description && (
                              <div className="text-sm text-gray-500 line-clamp-2">
                                {service.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {service.category_name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDuration(service.duration_minutes)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPrice(service.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => openOptionsModal(service)}
                              className="text-indigo-400 hover:text-indigo-600 p-1 rounded hover:bg-gray-100"
                              title="Manage options"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleEditService(service)}
                              className="text-[#F2C7EB] hover:text-[#E8A8D8] p-1 rounded hover:bg-gray-100"
                              title="Edit service"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteService(service.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-gray-100"
                              title="Delete service"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm"
              >
                {/* Clickable area for viewing details */}
                <div
                  onClick={() => handleViewService(service)}
                  className="p-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{service.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {service.category_name || 'Uncategorized'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDuration(service.duration_minutes)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatPrice(service.price)}
                      </span>
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 rounded-b-lg">
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => openOptionsModal(service)}
                      className="text-indigo-400 hover:text-indigo-600 p-2 rounded hover:bg-gray-100"
                      title="Manage options"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEditService(service)}
                      className="text-[#F2C7EB] hover:text-[#E8A8D8] p-2 rounded hover:bg-gray-100"
                      title="Edit service"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-gray-100"
                      title="Delete service"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Service Modal */}
      {showServiceModal && (
        <ServiceModal
          editingService={editingService}
          isClosing={isServiceModalClosing}
          serviceForm={serviceForm}
          serviceFormErrors={serviceFormErrors}
          categories={categories}
          onClose={closeServiceModal}
          onSubmit={handleSaveService}
          onFormChange={setServiceForm}
          onErrorChange={setServiceFormErrors}
        />
      )}

      {/* Service Details Modal */}
      {showServiceDetails && viewingService && (
        <ServiceDetailsModal
          service={viewingService}
          isClosing={isServiceDetailsClosing}
          onClose={closeServiceDetails}
          onEdit={handleEditService}
        />
      )}

      {/* Service Options Modal */}
      {showOptionsModal && optionsService && (
        <ServiceOptionsModal
          service={optionsService}
          optionsList={serviceOptionsList}
          editingOption={editingOption}
          optionForm={optionForm}
          showOptionForm={showOptionForm}
          loading={optionsLoading}
          onClose={closeOptionsModal}
          onSaveOption={handleSaveOption}
          onDeleteOption={handleDeleteOption}
          onEditOption={handleEditOption}
          onShowAddForm={() => {
            setShowOptionForm(true);
            setEditingOption(null);
            setOptionForm({
              name: '',
              description: '',
              price_adjustment: 0,
              duration_adjustment_minutes: 0,
              display_order: serviceOptionsList.length,
            });
          }}
          onCancelForm={() => {
            setShowOptionForm(false);
            setEditingOption(null);
            setOptionForm({
              name: '',
              description: '',
              price_adjustment: 0,
              duration_adjustment_minutes: 0,
              display_order: 0,
            });
          }}
          onFormChange={setOptionForm}
        />
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <CategoryModal
          editingCategory={editingCategory}
          isClosing={isCategoryModalClosing}
          categoryForm={categoryForm}
          categoryFormErrors={categoryFormErrors}
          onClose={closeCategoryModal}
          onSubmit={handleSaveCategory}
          onFormChange={setCategoryForm}
          onErrorChange={setCategoryFormErrors}
        />
      )}
    </div>
  );
}
