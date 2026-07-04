/**
 * src/hooks/useForm.js
 * ---------------------
 * Generic form state + field-level validation hook.
 *
 * Usage:
 *   const { values, errors, handleChange, validate, setErrors } = useForm(
 *     { email: '', password: '' },
 *     validators          // optional object of field → (value) => errorString | null
 *   );
 */
import { useState, useCallback } from 'react';

export function useForm(initialValues = {}, validators = {}) {
  const [values, setValues]   = useState(initialValues);
  const [errors, setErrors]   = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear error as user types
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  }, [errors]);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    if (validators[name]) {
      const err = validators[name](values[name]);
      setErrors((prev) => ({ ...prev, [name]: err ?? null }));
    }
  }, [validators, values]);

  /**
   * Run all validators. Returns true if the form is valid.
   */
  const validate = useCallback(() => {
    const newErrors = {};
    let valid = true;
    for (const [field, fn] of Object.entries(validators)) {
      const err = fn(values[field]);
      if (err) {
        newErrors[field] = err;
        valid = false;
      }
    }
    setErrors(newErrors);
    return valid;
  }, [validators, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return { values, errors, touched, handleChange, handleBlur, validate, setErrors, reset, setValues };
}
