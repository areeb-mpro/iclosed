import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Eye, 
  Save, 
  Loader2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Type,
  Text,
  Mail,
  Phone,
  Building,
  Briefcase,
  DollarSign,
  Users,
  Globe,
  Calendar,
  Clock,
  CheckSquare,
  Radio,
  List,
  Tag,
  MoreVertical,
  Copy
} from 'lucide-react';
import { useForm as useGetForm, useCreateForm, useUpdateForm } from '../../hooks/useForms';
import { useAuth } from '../../hooks/useAuth';
import { BookingForm, FormField } from '../types';
import { FORM_FIELD_TYPES, COMMON_FORM_FIELDS } from '../../utils/constants';
import { cn } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';

// Default field types with icons
const fieldTypeIcons: Record<string, any> = {
  text: Type,
  textarea: Text,
  email: Mail,
  phone: Phone,
  number: DollarSign,
  select: List,
  multiselect: List,
  checkbox: CheckSquare,
  radio: Radio,
  date: Calendar,
  datetime: Clock,
};

// Default field type
const DEFAULT_FIELD: FormField = {
  id: '',
  type: 'text',
  name: '',
  label: '',
  required: false,
  placeholder: '',
  options: null,
  defaultValue: null,
};

export default function FormBuilderPage() {
  const { id } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // State
  const [formData, setFormData] = useState<Partial<BookingForm>>({
    name: '',
    description: '',
    fields: [],
    isActive: true,
    settings: {},
  });
  
  const [isLoading, setIsLoading] = useState(!!id);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [showFieldMenu, setShowFieldMenu] = useState<string | null>(null);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newField, setNewField] = useState<Partial<FormField>>({
    ...DEFAULT_FIELD,
  });

  // Fetch form data if editing
  const { data: existingForm } = useGetForm(id || '');

  // Initialize form data
  useEffect(() => {
    if (existingForm) {
      setFormData({
        name: existingForm.name,
        description: existingForm.description || '',
        fields: existingForm.fields || [],
        isActive: existingForm.isActive,
        settings: existingForm.settings || {},
      });
      setIsLoading(false);
    } else if (!id) {
      setIsLoading(false);
    }
  }, [existingForm, id]);

  // Mutations
  const { mutate: createForm } = useCreateForm();
  const { mutate: updateForm } = useUpdateForm();

  // Handle form field changes
  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle field change
  const handleFieldChange = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newFields = [...(prev.fields || [])];
      newFields[index] = { ...newFields[index], [field]: value };
      return { ...prev, fields: newFields };
    });
  };

  // Add field
  const addField = (field?: Partial<FormField>) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type: 'text',
      name: '',
      label: '',
      required: false,
      placeholder: '',
      options: null,
      defaultValue: null,
      ...(field || newField),
    };
    
    setFormData(prev => ({
      ...prev,
      fields: [...(prev.fields || []), newField],
    }));
    
    if (field) {
      setShowAddFieldModal(false);
      setNewField({ ...DEFAULT_FIELD });
    }
  };

  // Remove field
  const removeField = (index: number) => {
    setFormData(prev => {
      const newFields = [...(prev.fields || [])];
      newFields.splice(index, 1);
      return { ...prev, fields: newFields };
    });
  };

  // Move field up
  const moveFieldUp = (index: number) => {
    if (index > 0) {
      setFormData(prev => {
        const newFields = [...(prev.fields || [])];
        [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
        return { ...prev, fields: newFields };
      });
    }
  };

  // Move field down
  const moveFieldDown = (index: number) => {
    if (index < (formData.fields?.length || 0) - 1) {
      setFormData(prev => {
        const newFields = [...(prev.fields || [])];
        [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
        return { ...prev, fields: newFields };
      });
    }
  };

  // Duplicate field
  const duplicateField = (index: number) => {
    const fieldToDuplicate = formData.fields?.[index];
    if (fieldToDuplicate) {
      addField({
        ...fieldToDuplicate,
        id: `field-${Date.now()}`,
        name: `${fieldToDuplicate.name}_copy`,
        label: `${fieldToDuplicate.label} (Copy)`,
      });
    }
  };

  // Add common field
  const addCommonField = (commonField: any) => {
    addField({
      id: `field-${Date.now()}`,
      type: commonField.type,
      name: commonField.name,
      label: commonField.label,
      required: commonField.required || false,
      placeholder: commonField.label,
      options: commonField.options || null,
      defaultValue: null,
    });
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Form name is required';
    }
    
    if (!formData.fields?.length) {
      newErrors.fields = 'At least one field is required';
    } else {
      // Check for duplicate field names
      const fieldNames = formData.fields.map(f => f.name);
      const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
      if (duplicates.length > 0) {
        newErrors.fields = 'Field names must be unique';
      }
      
      // Validate each field
      formData.fields.forEach((field, index) => {
        if (!field.name?.trim()) {
          newErrors[`field_${index}_name`] = 'Field name is required';
        }
        if (!field.label?.trim()) {
          newErrors[`field_${index}_label`] = 'Field label is required';
        }
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save form
  const saveForm = () => {
    if (!validate()) return;
    
    setIsSaving(true);
    
    const formPayload = {
      ...formData,
      organizationId: user?.organizationId,
    };
    
    if (id) {
      // Update existing form
      updateForm(
        { id, data: formPayload },
        {
          onSuccess: () => {
            setIsSaving(false);
            queryClient.invalidateQueries({ queryKey: ['forms'] });
            queryClient.invalidateQueries({ queryKey: ['form', id] });
            navigate('/forms');
          },
          onError: (error: any) => {
            setIsSaving(false);
            setErrors({ form: error.message || 'Failed to update form' });
          },
        }
      );
    } else {
      // Create new form
      createForm(
        formPayload,
        {
          onSuccess: (newForm) => {
            setIsSaving(false);
            queryClient.invalidateQueries({ queryKey: ['forms'] });
            navigate(`/forms/${newForm.id}/edit`);
          },
          onError: (error: any) => {
            setIsSaving(false);
            setErrors({ form: error.message || 'Failed to create form' });
          },
        }
      );
    }
  };

  // Start drag
  const startDrag = (index: number) => {
    setDragIndex(index);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== dropIndex) {
      setFormData(prev => {
        const newFields = [...(prev.fields || [])];
        const [removed] = newFields.splice(dragIndex, 1);
        newFields.splice(dropIndex, 0, removed);
        return { ...prev, fields: newFields };
      });
    }
    setDragIndex(null);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  // Get field type label
  const getFieldTypeLabel = (type: string) => {
    const fieldType = FORM_FIELD_TYPES.find(ft => ft.value === type);
    return fieldType ? fieldType.label : type;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/forms')}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Forms
          </button>
          
          <div>
            <h1 className="page-title">{id ? 'Edit Form' : 'Create New Form'}</h1>
            <p className="page-subtitle">
              {id ? `Editing: ${formData.name}` : 'Build your custom booking form'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => saveForm()}
            className="btn btn-primary btn-sm"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Save Form
              </>
            )}
          </button>
        </div>
      </div>

      {/* Form Settings Card */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Form Settings
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              Form Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleFormChange('name', e.target.value)}
              placeholder="e.g., Contact Form, Demo Request"
              className={cn('input', errors.name && 'input-error')}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>
          
          <div>
            <label className="label">Status</label>
            <select
              value={formData.isActive ? 'active' : 'inactive'}
              onChange={(e) => handleFormChange('isActive', e.target.value === 'active')}
              className="input"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleFormChange('description', e.target.value)}
              placeholder="Describe the purpose of this form"
              rows={3}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Fields Builder Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Form Fields
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddFieldModal(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Field
            </button>
            
            <button
              onClick={() => setShowAddFieldModal(true)}
              className="btn btn-outline btn-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Common Field
            </button>
          </div>
        </div>

        {/* Error message */}
        {errors.fields && (
          <p className="mb-4 text-sm text-red-600">{errors.fields}</p>
        )}

        {/* Fields list */}
        <div className="space-y-3">
          {formData.fields?.length ? (
            formData.fields.map((field, index) => {
              const FieldIcon = fieldTypeIcons[field.type] || Type;
              const hasOptions = field.type === 'select' || field.type === 'multiselect' || field.type === 'radio';
              
              return (
                <div
                  key={field.id || index}
                  draggable
                  onDragStart={() => startDrag(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  className={cn(
                    'p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-move',
                    dragIndex === index && 'bg-primary-50 border-primary-300'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Drag handle */}
                    <div className="flex items-center gap-1 text-gray-400 cursor-move">
                      <GripVertical className="h-4 w-4" />
                      <GripVertical className="h-4 w-4" />
                    </div>
                    
                    {/* Field icon */}
                    <div className="h-8 w-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FieldIcon className="h-4 w-4 text-primary-600" />
                    </div>
                    
                    {/* Field info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{field.label || 'Untitled Field'}</span>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                          {field.name}
                        </span>
                        {field.required && (
                          <span className="text-red-500 text-xs">(Required)</span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        {getFieldTypeLabel(field.type)}
                        {hasOptions && field.options?.length && (
                          <span className="ml-2">- {field.options.length} options</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Field actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveFieldUp(index)}
                        disabled={index === 0}
                        className="p-1 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                      >
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      </button>
                      
                      <button
                        onClick={() => moveFieldDown(index)}
                        disabled={index === (formData.fields?.length || 0) - 1}
                        className="p-1 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                      >
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      </button>
                      
                      <button
                        onClick={() => duplicateField(index)}
                        className="p-1 rounded-lg hover:bg-gray-200"
                      >
                        <Copy className="h-4 w-4 text-gray-500" />
                      </button>
                      
                      <button
                        onClick={() => setShowFieldMenu(field.id)}
                        className="p-1 rounded-lg hover:bg-gray-200"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </button>
                      
                      {/* Field menu */}
                      {showFieldMenu === field.id && (
                        <div className="absolute right-0 mt-2 w-40 rounded-lg shadow-lg bg-white border border-gray-200 z-50">
                          <div className="p-2">
                            <button
                              onClick={() => {
                                setShowFieldMenu(null);
                                // Edit field logic would go here
                              }}
                              className="dropdown-item"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </button>
                            
                            <button
                              onClick={() => {
                                duplicateField(index);
                                setShowFieldMenu(null);
                              }}
                              className="dropdown-item"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </button>
                            
                            <button
                              onClick={() => {
                                removeField(index);
                                setShowFieldMenu(null);
                              }}
                              className="dropdown-item text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state py-8">
              <FileText className="empty-state-icon" />
              <h3 className="empty-state-title">No fields added yet</h3>
              <p className="empty-state-description">
                Click "Add Field" to start building your form
              </p>
            </div>
          )}
        </div>

        {/* Field errors */}
        {Object.entries(errors).map(([key, error]) => {
          if (key.startsWith('field_')) {
            return (
              <p key={key} className="mt-2 text-sm text-red-600">{error}</p>
            );
          }
          return null;
        })}
      </div>

      {/* Form Preview Card */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Form Preview
        </h2>
        
        <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">{formData.name || 'Untitled Form'}</h3>
            {formData.description && (
              <p className="text-gray-600 mt-2">{formData.description}</p>
            )}
          </div>
          
          <div className="space-y-4">
            {formData.fields?.map((field, index) => {
              const FieldIcon = fieldTypeIcons[field.type] || Type;
              
              return (
                <div key={field.id || index} className="space-y-1">
                  <label className="label">
                    {field.label || 'Untitled Field'}
                    {field.required && <span className="text-red-500"> *</span>}
                  </label>
                  
                  {field.type === 'textarea' && (
                    <textarea
                      placeholder={field.placeholder || `Enter ${field.label}`}
                      rows={3}
                      className="input w-full"
                    />
                  )}
                  
                  {field.type === 'select' && field.options && (
                    <select className="input w-full">
                      <option value="">{field.placeholder || `Select ${field.label}`}</option>
                      {field.options.map((option, i) => (
                        <option key={i} value={option}>{option}</option>
                      ))}
                    </select>
                  )}
                  
                  {field.type === 'multiselect' && field.options && (
                    <div className="space-y-2">
                      {field.options.map((option, i) => (
                        <label key={i} className="flex items-center gap-2">
                          <input type="checkbox" className="h-4 w-4" />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {field.type === 'checkbox' && (
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4" />
                      <span>{field.label}</span>
                    </label>
                  )}
                  
                  {field.type === 'radio' && field.options && (
                    <div className="space-y-2">
                      {field.options.map((option, i) => (
                        <label key={i} className="flex items-center gap-2">
                          <input type="radio" name={field.name} className="h-4 w-4" />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {field.type === 'date' && (
                    <input type="date" className="input w-full" />
                  )}
                  
                  {field.type === 'datetime' && (
                    <input type="datetime-local" className="input w-full" />
                  )}
                  
                  {(field.type === 'text' || field.type === 'email' || field.type === 'phone' || field.type === 'number') && (
                    <input
                      type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'number' ? 'number' : 'text'}
                      placeholder={field.placeholder || `Enter ${field.label}`}
                      className="input w-full"
                    />
                  )}
                </div>
              );
            })}
            
            {formData.fields?.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                No fields to display. Add fields to see the preview.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Add Field Modal */}
      {showAddFieldModal && (
        <div className="modal-overlay" onClick={() => setShowAddFieldModal(false)}>
          <div 
            className="modal-panel max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Add Field
              </h2>
              
              <button
                onClick={() => {
                  setShowAddFieldModal(false);
                  setNewField({ ...DEFAULT_FIELD });
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XCircle className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="label">
                  Field Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={newField.type || 'text'}
                  onChange={(e) => setNewField(prev => ({ ...prev, type: e.target.value }))}
                  className="input"
                >
                  {FORM_FIELD_TYPES.map((fieldType) => (
                    <option key={fieldType.value} value={fieldType.value}>
                      {fieldType.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="label">
                  Field Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newField.name || ''}
                  onChange={(e) => setNewField(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., firstName, email, company"
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used as the field identifier. Must be unique and contain no spaces.
                </p>
              </div>
              
              <div>
                <label className="label">
                  Field Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newField.label || ''}
                  onChange={(e) => setNewField(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g., First Name, Email Address"
                  className="input"
                />
              </div>
              
              <div>
                <label className="label">Placeholder</label>
                <input
                  type="text"
                  value={newField.placeholder || ''}
                  onChange={(e) => setNewField(prev => ({ ...prev, placeholder: e.target.value }))}
                  placeholder="e.g., Enter your first name"
                  className="input"
                />
              </div>
              
              <div>
                <label className="label">
                  <input
                    type="checkbox"
                    checked={newField.required || false}
                    onChange={(e) => setNewField(prev => ({ ...prev, required: e.target.checked }))}
                    className="h-4 w-4 mr-2"
                  />
                  Required
                </label>
              </div>
              
              {(newField.type === 'select' || newField.type === 'multiselect' || newField.type === 'radio') && (
                <div>
                  <label className="label">Options (comma separated)</label>
                  <textarea
                    value={(newField.options as string[] || []).join(', ')}
                    onChange={(e) => setNewField(prev => ({
                      ...prev,
                      options: e.target.value.split(',').map(o => o.trim()).filter(o => o)
                    }))}
                    placeholder="e.g., Option 1, Option 2, Option 3"
                    rows={3}
                    className="input"
                  />
                </div>
              )}
              
              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => {
                    setShowAddFieldModal(false);
                    setNewField({ ...DEFAULT_FIELD });
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                
                <button
                  onClick={() => {
                    addField(newField);
                    setNewField({ ...DEFAULT_FIELD });
                  }}
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Field
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Common Fields Quick Add */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Add: Common Fields
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {COMMON_FORM_FIELDS.map((commonField) => (
            <button
              key={commonField.name}
              onClick={() => addCommonField(commonField)}
              className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-gray-700">{commonField.label}</span>
              {commonField.required && (
                <span className="text-red-500 text-xs">*</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Save button (sticky at bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-end gap-3">
          <button
            onClick={() => navigate('/forms')}
            className="btn btn-outline"
          >
            Cancel
          </button>
          
          <button
            onClick={() => saveForm()}
            className="btn btn-primary"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Save Form
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
