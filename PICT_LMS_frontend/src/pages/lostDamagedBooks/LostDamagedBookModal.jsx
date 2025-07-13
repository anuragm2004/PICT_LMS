import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiBook, FiPlus, FiMinus } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import ConfirmationModal from '../../components/ConfirmationModal';

const LostDamagedBookModal = ({ record, onClose }) => {
  const [formData, setFormData] = useState({
    book_id: '',
    quantity: 1,
  });
  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
    onConfirm: null
  });

  // Fetch all books for selection (only for new records)
  const { data: books, isLoading: isLoadingBooks } = useQuery({
    queryKey: ['books'],
    queryFn: async () => {
      try {
        const response = await api.get('/books');
        console.log('Fetched books:', response.data);
        // Check if response.data is an array or has a books property
        return Array.isArray(response.data) ? response.data : (response.data.books || []);
      } catch (error) {
        console.error('Error fetching books:', error);
        console.error('Error details:', error.response?.data);
        toast.error('Failed to fetch books');
        return [];
      }
    },
    enabled: !record, // Only fetch books for new records
  });

  // Fetch book details for update
  const { data: bookDetails, isLoading: isLoadingBookDetails } = useQuery({
    queryKey: ['book', record?.book_id],
    queryFn: async () => {
      if (!record?.book_id) return null;
      try {
        const response = await api.get(`/books/${record.book_id}`);
        console.log('Fetched book details:', response.data);
        // The API returns the book directly in the response data
        return response.data;
      } catch (error) {
        console.error('Error fetching book details:', error);
        console.error('Error details:', error.response?.data);
        toast.error('Failed to fetch book details');
        return null;
      }
    },
    enabled: !!record?.book_id, // Only fetch if we have a book_id
  });

  useEffect(() => {
    if (record) {
      setFormData({
        book_id: record.book_id,
        quantity: record.quantity,
      });
    }
  }, [record]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.book_id) {
      newErrors.book_id = 'Book is required';
    }
    if (formData.quantity < 0) {
      newErrors.quantity = 'Quantity cannot be negative';
    }
    
    // Check if selected book exists and has enough available copies
    const selectedBook = books?.find(book => book.book_id === formData.book_id);
    if (selectedBook && formData.quantity > selectedBook.available_copies) {
      newErrors.quantity = `Only ${selectedBook.available_copies} copies available`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      try {
        console.log('Creating record with data:', data);
        // Check if the book has enough available copies
        const bookResponse = await api.get(`/books/${data.book_id}`);
        const book = bookResponse.data;
        
        if (data.quantity > book.available_copies) {
          throw new Error(`Requested quantity (${data.quantity}) exceeds available book quantity (${book.available_copies})`);
        }
        
        const response = await api.post('/lost-damaged-books', {
          book_id: data.book_id,
          quantity: data.quantity
        });
        return response.data;
      } catch (error) {
        console.error('Error creating record:', error);
        console.error('Error details:', error.response?.data);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lostDamagedBooks'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      showMessage('success', 'Record Created', 'The lost/damaged book record has been successfully created.');
      onClose();
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create record';
      showMessage('error', 'Creation Failed', errorMessage);
      if (errorMessage.includes('quantity')) {
        setErrors(prev => ({
          ...prev,
          quantity: errorMessage
        }));
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      try {
        console.log('Updating record with ID:', id);
        console.log('Update data:', data);
        
        // For update, we only need to send the quantity
        const response = await api.put(`/lost-damaged-books/${id}`, {
          quantity: data.quantity
        });
        return response.data;
      } catch (error) {
        console.error('Error updating record:', error);
        console.error('Error details:', error.response?.data);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lostDamagedBooks'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      showMessage('success', 'Record Updated', 'The lost/damaged book record has been successfully updated.');
      onClose();
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update record';
      showMessage('error', 'Update Failed', errorMessage);
      // Set form error if it's a quantity error
      if (errorMessage.includes('quantity')) {
        setErrors(prev => ({
          ...prev,
          quantity: errorMessage
        }));
      }
    },
  });

  const showMessage = (type, title, message) => {
    setConfirmationModal({
      isOpen: true,
      type,
      title,
      message,
      onConfirm: null
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (record) {
        // If quantity is 0, show confirmation modal
        if (formData.quantity === 0) {
          setConfirmationModal({
            isOpen: true,
            type: 'confirmation',
            title: 'Confirm Deletion',
            message: 'Setting quantity to 0 will delete this record. Are you sure you want to proceed?',
            onConfirm: async () => {
              await updateMutation.mutateAsync({
                id: record.lost_damaged_book_id,
                data: formData,
              });
            }
          });
        } else {
          await updateMutation.mutateAsync({
            id: record.lost_damaged_book_id,
            data: formData,
          });
        }
      } else {
        await createMutation.mutateAsync(formData);
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    }
  };

  const isLoading = (!record && isLoadingBooks) || (record && isLoadingBookDetails);
  const isSubmitting = createMutation.isLoading || updateMutation.isLoading;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-xl w-full max-w-md"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {record ? 'Edit Lost/Damaged Book' : 'Add Lost/Damaged Book'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors duration-200"
              >
                <FiX className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {record ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Book
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {isLoadingBookDetails ? (
                      <p className="text-sm text-gray-500">Loading book details...</p>
                    ) : bookDetails ? (
                      <div>
                        <p className="text-lg font-medium text-gray-900">{bookDetails.title}</p>
                        <p className="text-sm text-gray-600">by {bookDetails.author}</p>
                        <p className="text-sm text-gray-500 mt-1">ISBN: {bookDetails.isbn}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-red-500">Failed to load book details</p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select a Book
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiBook className="h-5 w-5 text-gray-400" />
                    </div>
                    {isLoadingBooks ? (
                      <div className="input pl-10 flex items-center">
                        <p className="text-sm text-gray-500">Loading books...</p>
                      </div>
                    ) : books && books.length > 0 ? (
                      <select
                        value={formData.book_id}
                        onChange={(e) => setFormData({ ...formData, book_id: e.target.value })}
                        className={`input pl-10 ${errors.book_id ? 'border-red-500' : ''}`}
                      >
                        <option value="">Select a book</option>
                        {books.map((book) => (
                          <option key={book.book_id} value={book.book_id}>
                            {book.title} (ISBN: {book.isbn}) - {book.quantity || 0} available
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="input pl-10 flex items-center">
                        <p className="text-sm text-red-500">No books available</p>
                      </div>
                    )}
                  </div>
                  {errors.book_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.book_id}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.quantity > 0) {
                        setFormData({ ...formData, quantity: formData.quantity - 1 });
                      }
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors duration-200"
                    disabled={formData.quantity <= 0}
                  >
                    <FiMinus className="h-5 w-5" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 0) {
                        setFormData({ ...formData, quantity: value });
                      }
                    }}
                    className={`input text-center w-20 ${errors.quantity ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, quantity: formData.quantity + 1 });
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors duration-200"
                  >
                    <FiPlus className="h-5 w-5" />
                  </button>
                </div>
                {errors.quantity && (
                  <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
                )}
                {!record && formData.book_id && books && (
                  <p className="mt-1 text-sm text-gray-500">
                    {books.find(b => b.book_id === formData.book_id)?.available_copies} copies available
                  </p>
                )}
                {record && formData.quantity === 0 && (
                  <p className="mt-1 text-sm text-amber-600">
                    Setting quantity to 0 will delete this record
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : record ? (
                    'Update'
                  ) : (
                    'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        message={confirmationModal.message}
        type={confirmationModal.type}
      />
    </AnimatePresence>
  );
};

export default LostDamagedBookModal; 