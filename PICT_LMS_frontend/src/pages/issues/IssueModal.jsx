import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiBook, FiUser, FiCalendar, FiRefreshCw } from 'react-icons/fi';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

const IssueModal = ({ issue, onClose, onSuccess, onError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const isEditing = !!issue;

  // Fetch available books
  const { data: books = [], isLoading: isLoadingBooks } = useQuery({
    queryKey: ['books'],
    queryFn: async () => {
      try {
        const response = await api.get('/books');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching books:', error);
        throw error;
      }
    },
    enabled: !isEditing, // Only fetch books for new issues
  });

  // Fetch available users (non-admin)
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const response = await api.get('/users');
        return response.data.filter(user => user.kind !== 'ADMIN') || [];
      } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
    },
    enabled: !isEditing, // Only fetch users for new issues
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: issue
      ? {
          return_date: new Date().toISOString().split('T')[0],
        }
      : {
          user_id: '',
          book_id: '',
        },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      try {
        const response = await api.post('/issue-records', {
          user_id: data.user_id,
          book_id: data.book_id,
        });
        return response.data;
      } catch (error) {
        console.error('Error creating issue record:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['issues']);
      queryClient.invalidateQueries(['books']);
      onSuccess('Book issued successfully');
      onClose();
    },
    onError: (error) => {
      onError(error.response?.data?.message || 'Failed to issue book');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      try {
        const response = await api.put(`/issue-records/return/${issue.issue_record_id}`, {
          return_date: data.return_date,
        });
        return response.data;
      } catch (error) {
        console.error('Error returning book:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['issues']);
      queryClient.invalidateQueries(['books']);
      onSuccess('Book returned successfully');
      onClose();
    },
    onError: (error) => {
      onError(error.response?.data?.message || 'Failed to return book');
    },
  });

  const renewMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await api.put(`/issue-records/renew/${issue.issue_record_id}`);
        return response.data;
      } catch (error) {
        console.error('Error renewing book:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['issues']);
      onSuccess('Book renewed successfully');
      onClose();
    },
    onError: (error) => {
      onError(error.response?.data?.message || 'Failed to renew book');
    },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      if (isEditing) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenew = async () => {
    setIsLoading(true);
    try {
      await renewMutation.mutateAsync();
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
          className="bg-white rounded-xl shadow-xl w-full max-w-md"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? 'Return Book' : 'Issue New Book'}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {!isEditing && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Book
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiBook className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        {...register('book_id', { required: 'Book is required' })}
                        className="input pl-10 w-full"
                        disabled={isLoadingBooks}
                      >
                        <option value="">Select a book</option>
                        {books.map((book) => (
                          <option key={book.book_id} value={book.book_id}>
                            {book.title} ({book.book_id}) - {book.quantity} available
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.book_id && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.book_id.message}
                      </p>
                    )}
                    {isLoadingBooks && (
                      <p className="mt-1 text-sm text-gray-500">Loading books...</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      User
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiUser className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        {...register('user_id', { required: 'User is required' })}
                        className="input pl-10 w-full"
                        disabled={isLoadingUsers}
                      >
                        <option value="">Select a user</option>
                        {users.map((user) => (
                          <option key={user.user_id} value={user.user_id}>
                            {user.name} ({user.user_id})
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.user_id && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.user_id.message}
                      </p>
                    )}
                    {isLoadingUsers && (
                      <p className="mt-1 text-sm text-gray-500">Loading users...</p>
                    )}
                  </div>
                </>
              )}

              {isEditing && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-900">
                      {issue.Book.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Issued to: {issue.User.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Issue Date: {new Date(issue.issue_date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Due Date: {new Date(issue.due_date).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Return Date
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiCalendar className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="date"
                        {...register('return_date', {
                          required: 'Return date is required',
                        })}
                        className="input pl-10 w-full"
                      />
                    </div>
                    {errors.return_date && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.return_date.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                {isEditing && !issue.returned && (
                  <button
                    type="button"
                    onClick={handleRenew}
                    disabled={isLoading}
                    className="btn btn-primary flex items-center space-x-2"
                  >
                    <FiRefreshCw className="h-4 w-4" />
                    <span>Renew</span>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isLoading || (!isEditing && (isLoadingBooks || isLoadingUsers))}
                  className="btn btn-primary"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : isEditing ? (
                    'Return Book'
                  ) : (
                    'Issue Book'
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default IssueModal; 