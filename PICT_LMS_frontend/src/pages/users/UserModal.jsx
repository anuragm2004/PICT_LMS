import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { FiX, FiUser, FiMail, FiPhone, FiLock } from 'react-icons/fi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

const UserModal = ({ user, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const isEditing = !!user;

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: user || {
      name: '',
      email: '',
      phone: '',
      kind: 'STUDENT',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  const createMutation = useMutation({
    mutationFn: async (data) => {
      try {
        // Remove confirmPassword before sending to API
        const { confirmPassword, ...userData } = data;
        
        // Format the data to match backend expectations
        const formattedData = {
          ...userData,
          role: userData.kind // Map 'kind' to 'role' as expected by backend
        };

        console.log('Sending user data to backend:', formattedData);
        
        const response = await api.post('/users', formattedData);
        return response.data;
      } catch (error) {
        console.error('Error creating user:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          data: error.response?.data
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
      onClose();
    },
    onError: (error) => {
      console.error('Create user error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error(
        error.response?.data?.message || 
        'Failed to create user. Please check all fields and try again.'
      );
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data) => {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...userData } = data;
      
      // Format the data to match what the backend expects
      const formattedData = {
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        role: userData.kind, // Map 'kind' to 'role' for the backend
      };
      
      // Only include password if it's provided
      if (userData.password) {
        formattedData.password = userData.password;
      }
      
      console.log('Updating user data:', formattedData);
      const response = await api.put(`/users/${user.user_id}`, formattedData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
      onClose();
    },
    onError: (error) => {
      console.error('Error updating user:', error.response?.data || error);
      toast.error(error.response?.data?.message || 'Error updating user. Please try again.');
    },
  });

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      if (isEditing) {
        await updateUserMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {isEditing ? 'Edit User' : 'Add New User'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <FiX className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('name', {
                      required: 'Name is required',
                      minLength: {
                        value: 2,
                        message: 'Name must be at least 2 characters',
                      },
                    })}
                    type="text"
                    className="input pl-10"
                    placeholder="Enter full name"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                    type="email"
                    className="input pl-10"
                    placeholder="Enter email"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiPhone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('phone', {
                      pattern: {
                        value: /^[0-9]{10}$/,
                        message: 'Invalid phone number',
                      },
                    })}
                    type="tel"
                    className="input pl-10"
                    placeholder="Enter phone number"
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  {...register('kind', { required: 'Role is required' })}
                  className="input"
                >
                  <option value="STUDENT">Student</option>
                  <option value="ADMIN">Admin</option>
                </select>
                {errors.kind && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.kind.message}
                  </p>
                )}
              </div>

              {!isEditing && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiLock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('password', {
                          required: 'Password is required',
                          minLength: {
                            value: 6,
                            message: 'Password must be at least 6 characters',
                          },
                        })}
                        type="password"
                        className="input pl-10"
                        placeholder="Enter password"
                      />
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Confirm Password
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiLock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('confirmPassword', {
                          required: 'Please confirm your password',
                          validate: (value) =>
                            value === password || 'Passwords do not match',
                        })}
                        type="password"
                        className="input pl-10"
                        placeholder="Confirm password"
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary"
                >
                  {isLoading
                    ? 'Saving...'
                    : isEditing
                    ? 'Update User'
                    : 'Create User'}
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UserModal; 