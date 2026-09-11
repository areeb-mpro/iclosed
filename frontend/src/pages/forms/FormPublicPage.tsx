import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePublicForm, useSubmitForm } from '../../hooks/useForms';
import { FormField, BookingForm } from '../../types';
import { FORM_FIELD_TYPES } from '../../utils/constants';
import { isValidEmail } from '../../utils/helpers';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function FormPublicPage() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  
  const { data: form, isLoading, isError, error } = usePublicForm(formId || '');
  const { mutate: submitForm, isPending: isSubmitting } = useSubmitForm(formId || '');
  
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Initialize form data when form loads
  useEffect(() => {
    if (form) {
      const initialData: Record<string, any> = {};
      form.fields.forEach((field: FormField) => {
        initialData[field.name] = field.defaultValue || '';
      });
      setFormData(initialData);
    }
  }, [form]);
  
  // Track form visit
  useEffect(() => {
    if (formId) {
      // Increment visit count
      fetch(`/api/forms/${formId}/visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {});
    }
  }, [formId]);
  
  const handleChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Clear error when user types
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };
  
  const validateField = (field: FormField, value: any): string | null => {
    // Required validation
    if (field.required && !value && value !== 0) {
      return `${field.label} is required`;
    }
    
    // Type-specific validation
    if (value || value === 0) {
      switch (field.type) {
        case 'email':
          if (value && !isValidEmail(value)) {
            return `${field.label} must be a valid email address`;
          }
          break;
        case 'phone':
          if (value) {
            const phone = String(value).replace(/\D/g, '');
            if (phone.length < 10) {
              return `${field.label} must be a valid phone number`;
            }
          }
          break;
        case 'number':
          if (isNaN(value)) {
            return `${field.label} must be a number`;
          }
          break;
        case 'select':
          if (field.options && value && !field.options.includes(value)) {
            return `${field.label} must be one of the available options`;
          }
          break;
        case 'multiselect':
          if (field.options && Array.isArray(value)) {
            const invalid = value.some((v: string) => !field.options?.includes(v));
            if (invalid) {
              return `${field.label} contains invalid options`;
            }
          }
          break;
      }
    }
    
    return null;
  };
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    
    if (!form) return false;
    
    form.fields.forEach((field: FormField) => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
        isValid = false;
      }
    });
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    try {
      submitForm(formData, {
        onSuccess: (response) => {
          setIsSubmitted(true);
          toast.success('Thank you! Your submission has been received.');
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to submit form. Please try again.');
        }
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit form. Please try again.');
    }
  };
  
  const renderField = (field: FormField) => {
    const value = formData[field.name] || '';
    const error = errors[field.name];
    
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        return (
          <div key={field.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'number' ? 'number' : 'text'}
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder || ''}
              className={`w-full px-3 py-2 border rounded-md ${error ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
            />
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        );
      
      case 'textarea':
        return (
          <div key={field.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder || ''}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md ${error ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none`}
            />
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        );
      
      case 'select':
        return (
          <div key={field.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className={`w-full px-3 py-2 border rounded-md ${error ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
            >
              <option value="">{field.placeholder || `Select ${field.label}`}</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        );
      
      case 'multiselect':
        return (
          <div key={field.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              multiple
              value={Array.isArray(value) ? value : []}
              onChange={(e) => {
                const options = Array.from(e.target.selectedOptions, option => option.value);
                handleChange(field.name, options);
              }}
              className={`w-full px-3 py-2 border rounded-md ${error ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
              size={Math.min(field.options?.length || 1, 5)}
            >
              {field.options?.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        );
      
      case 'checkbox':
        return (
          <div key={field.name} className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => handleChange(field.name, e.target.checked)}
                className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </span>
            </label>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        );
      
      case 'checkbox_group':
        return (
          <div key={field.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <label key={option} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(Array.isArray(value) ? value : []).includes(option)}
                    onChange={(e) => {
                      const current = Array.isArray(value) ? value : [];
                      if (e.target.checked) {
                        handleChange(field.name, [...current, option]);
                      } else {
                        handleChange(field.name, current.filter((v: string) => v !== option));
                      }
                    }}
                    className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        );
      
      case 'radio':
        return (
          <div key={field.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <label key={option} className="flex items-center">
                  <input
                    type="radio"
                    name={field.name}
                    value={option}
                    checked={value === option}
                    onChange={() => handleChange(field.name, option)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        );
      
      case 'date':
        return (
          <div key={field.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="date"
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className={`w-full px-3 py-2 border rounded-md ${error ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
            />
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        );
      
      case 'datetime':
        return (
          <div key={field.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="datetime-local"
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className={`w-full px-3 py-2 border rounded-md ${error ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
            />
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        );
      
      case 'hidden':
        return (
          <input
            key={field.name}
            type="hidden"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
          />
        );
      
      default:
        return (
          <div key={field.name} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder || ''}
              className={`w-full px-3 py-2 border rounded-md ${error ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-primary-500`}
            />
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
          </div>
        );
    }
  };
  
  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-600">Your information has been submitted successfully.</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-2">What happens next:</p>
            <ul className="text-left text-sm text-gray-600 space-y-1">
              <li>• We will review your submission</li>
              <li>• If qualified, we'll reach out to schedule a meeting</li>
              <li>• You'll receive a confirmation email shortly</li>
            </ul>
          </div>
          
          <button
            onClick={() => navigate('/')}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  // Error state
  if (isError || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h2>
          <p className="text-gray-600 mb-6">
            {error ? 'An error occurred while loading the form.' : 'The requested form does not exist or has been deactivated.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }
  
  // Form rendering
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900">LeadFlow</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Form header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{form.name}</h1>
            {form.description && (
              <p className="text-gray-600">{form.description}</p>
            )}
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <span>Powered by LeadFlow</span>
            </div>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {form.fields.map((field: FormField) => (
                <div key={field.id || field.name} className="md:col-span-${field.type === 'textarea' || field.type === 'checkbox_group' || field.type === 'multiselect' ? '2' : '1'}">
                  {renderField(field)}
                </div>
              ))}
            </div>
            
            {/* Submit button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </span>
                ) : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} LeadFlow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
