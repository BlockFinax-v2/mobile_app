import { useState, useCallback } from 'react';
import { useForm, FieldValues, UseFormProps, Path } from 'react-hook-form';

/**
 * Enhanced form hook with common validation and state management
 */
export function useAppForm<T extends FieldValues>(
  options?: UseFormProps<T>
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<T>(options);

  const handleSubmit = useCallback(
    (onSubmit: (data: T) => Promise<void> | void) =>
      form.handleSubmit(async (data) => {
        try {
          setIsSubmitting(true);
          setSubmitError(null);
          
          const result = onSubmit(data);
          if (result instanceof Promise) {
            await result;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'An error occurred';
          setSubmitError(errorMessage);
          console.error('Form submission error:', error);
        } finally {
          setIsSubmitting(false);
        }
      }),
    [form]
  );

  const resetForm = useCallback(() => {
    form.reset();
    setSubmitError(null);
    setIsSubmitting(false);
  }, [form]);

  const setFieldErrors = useCallback((errors: Partial<Record<keyof T, string>>) => {
    Object.entries(errors).forEach(([field, message]) => {
      form.setError(field as unknown as Path<T>, {
        type: 'manual',
        message: message as string,
      });
    });
  }, [form]);

  return {
    ...form,
    isSubmitting,
    submitError,
    handleSubmit,
    resetForm,
    setFieldErrors,
  };
}

/**
 * Simple form state hook for basic forms without validation library
 */
export function useSimpleForm<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const reset = useCallback((newValues?: Partial<T>) => {
    setValues(newValues ? { ...initialValues, ...newValues } : initialValues);
    setErrors({});
    setIsSubmitting(false);
  }, [initialValues]);

  const validate = useCallback((
    validators: Partial<Record<keyof T, (value: any) => string | undefined>>
  ): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let hasErrors = false;

    Object.entries(validators).forEach(([field, validator]) => {
      const error = validator!(values[field as keyof T]);
      if (error) {
        newErrors[field as keyof T] = error;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  }, [values]);

  const handleSubmit = useCallback(
    (
      onSubmit: (data: T) => Promise<void> | void,
      validators?: Partial<Record<keyof T, (value: any) => string | undefined>>
    ) =>
      async () => {
        try {
          if (validators && !validate(validators)) {
            return;
          }

          setIsSubmitting(true);
          const result = onSubmit(values);
          if (result instanceof Promise) {
            await result;
          }
        } catch (error) {
          console.error('Form submission error:', error);
        } finally {
          setIsSubmitting(false);
        }
      },
    [values, validate]
  );

  return {
    values,
    errors,
    isSubmitting,
    setValue,
    setFieldError,
    clearErrors,
    reset,
    validate,
    handleSubmit,
  };
}

/**
 * Common form validators
 */
export const validators = {
  required: (fieldName: string) => (value: any) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return undefined;
  },

  email: (value: string) => {
    if (!value) return undefined;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? undefined : 'Please enter a valid email address';
  },

  minLength: (min: number) => (value: string) => {
    if (!value) return undefined;
    return value.length >= min ? undefined : `Must be at least ${min} characters`;
  },

  maxLength: (max: number) => (value: string) => {
    if (!value) return undefined;
    return value.length <= max ? undefined : `Must be no more than ${max} characters`;
  },

  numeric: (value: string) => {
    if (!value) return undefined;
    return /^\d+(\.\d+)?$/.test(value) ? undefined : 'Must be a valid number';
  },

  walletAddress: (value: string) => {
    if (!value) return undefined;
    return /^0x[a-fA-F0-9]{40}$/.test(value) ? undefined : 'Must be a valid wallet address';
  },

  phone: (value: string) => {
    if (!value) return undefined;
    const phoneRegex = /^[+]?[\d\s\-()]+$/;
    return phoneRegex.test(value) ? undefined : 'Please enter a valid phone number';
  },

  url: (value: string) => {
    if (!value) return undefined;
    try {
      new URL(value);
      return undefined;
    } catch {
      return 'Please enter a valid URL';
    }
  },

  date: (value: string) => {
    if (!value) return undefined;
    const date = new Date(value);
    return isNaN(date.getTime()) ? 'Please enter a valid date' : undefined;
  },

  match: (compareValue: string, fieldName: string) => (value: string) => {
    return value === compareValue ? undefined : `Must match ${fieldName}`;
  },
};