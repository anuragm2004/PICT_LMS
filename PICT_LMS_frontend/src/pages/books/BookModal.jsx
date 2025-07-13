import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiBook, FiUser, FiHash, FiTag } from 'react-icons/fi';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

const VALID_CATEGORIES = [
  "Programming Languages",
  "Data Structures & Algorithms",
  "Operating Systems",
  "Artificial Intelligence & Machine Learning",
  "Databases",
  "Cybersecurity",
  "Software Engineering",
  "Digital Electronics",
  "Signal Processing",
  "Communication Systems",
  "VLSI Design",
  "Embedded Systems",
  "Circuit Theory",
  "Power Systems",
  "Control Systems",
  "Electrical Machines",
  "Renewable Energy",
  "Thermodynamics",
  "Fluid Mechanics",
  "Manufacturing Processes",
  "Robotics",
  "CAD/CAM",
  "Structural Engineering",
  "Transportation Engineering",
  "Surveying",
  "Construction Management",
  "Environmental Engineering",
  "Web Development",
  "Mobile App Development",
  "Cloud Computing",
  "Data Analytics",
  "Human-Computer Interaction",
  "Discrete Mathematics",
  "Engineering Mathematics",
  "Physics",
  "Chemistry",
  "Statistics",
  "Communication Skills",
  "Professional Ethics",
  "Economics for Engineers",
  "Psychology",
  "Soft Skills",
  "Reference Books",
  "Project Reports / Theses",
  "Journals & Magazines",
  "E-Books & Online Resources",
  "Competitive Exam Materials (GATE, GRE, etc.)",
  "Research Papers",
  "Previous Year Question Papers",
];

const BookModal = ({ book, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const isEditing = !!book;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: book || {
      title: '',
      author: '',
      isbn: '',
      category: '',
      publication: '',
      quantity: 1,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/books', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['books']);
      toast.success('Book added successfully');
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add book');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/books/${book.book_id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['books']);
      toast.success('Book updated successfully');
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update book');
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
                {isEditing ? 'Edit Book' : 'Add New Book'}
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
                  Title
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiBook className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('title', {
                      required: 'Title is required',
                      minLength: {
                        value: 2,
                        message: 'Title must be at least 2 characters',
                      },
                    })}
                    type="text"
                    className="input pl-10"
                    placeholder="Enter book title"
                  />
                </div>
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Author
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('author', {
                      required: 'Author is required',
                      minLength: {
                        value: 2,
                        message: 'Author name must be at least 2 characters',
                      },
                    })}
                    type="text"
                    className="input pl-10"
                    placeholder="Enter author name"
                  />
                </div>
                {errors.author && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.author.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ISBN
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiHash className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('isbn', {
                      required: 'ISBN is required',
                      pattern: {
                        value: /^(?:\d{10}|\d{13})$/,
                        message: 'Invalid ISBN format',
                      },
                    })}
                    type="text"
                    className="input pl-10"
                    placeholder="Enter ISBN"
                  />
                </div>
                {errors.isbn && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.isbn.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Publication
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiBook className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('publication', {
                      required: 'Publication is required',
                    })}
                    type="text"
                    className="input pl-10"
                    placeholder="Enter publication name"
                  />
                </div>
                {errors.publication && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.publication.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiTag className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    {...register('category', {
                      required: 'Category is required',
                    })}
                    className="input pl-10"
                  >
                    <option value="">Select a category</option>
                    {VALID_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.category.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quantity
                </label>
                <input
                  {...register('quantity', {
                    required: 'Quantity is required',
                    min: {
                      value: 1,
                      message: 'Quantity must be at least 1',
                    },
                  })}
                  type="number"
                  className="input"
                  min="1"
                />
                {errors.quantity && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.quantity.message}
                  </p>
                )}
              </div>

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
                    ? 'Update Book'
                    : 'Add Book'}
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BookModal; 