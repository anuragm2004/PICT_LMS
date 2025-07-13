import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import BookModal from './BookModal';
import { useAuth } from '../../context/AuthContext';

const BookCard = ({ book, onEdit, onDelete, isAdmin }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 p-6"
  >
    {/* Book Information Section */}
    <div className="flex items-start justify-between mb-8">
      <div className="max-w-[70%]">
        <h3 
          className="text-lg font-semibold text-gray-900 truncate cursor-help" 
          title={book.title}
        >
          {book.title}
        </h3>
        <p 
          className="text-sm text-gray-600 mt-1 truncate cursor-help" 
          title={book.author}
        >
          {book.author}
        </p>
      </div>
      {isAdmin && (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(book)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200"
          >
            <FiEdit2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => onDelete(book)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200"
          >
            <FiTrash2 className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>

    {/* Book Details Section */}
    <div className="grid grid-cols-2 gap-6 pl-2">
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">ISBN</p>
        <p 
          className="text-sm text-gray-900 truncate cursor-help" 
          title={book.isbn}
        >
          {book.isbn}
        </p>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">Category</p>
        <p 
          className="text-sm text-gray-900 truncate cursor-help" 
          title={book.category}
        >
          {book.category}
        </p>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">Quantity</p>
        <p className="text-sm text-gray-900">{book.quantity}</p>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">Status</p>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            book.quantity > 0
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {book.quantity > 0 ? 'Available' : 'Not Available'}
        </span>
      </div>
    </div>
  </motion.div>
);

const Books = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const isAdmin = user?.kind === 'ADMIN';

  const { data: books, isLoading } = useQuery({
    queryKey: ['books'],
    queryFn: async () => {
      const response = await api.get('/books');
      return response.data;
    },
  });

  const deleteBookMutation = useMutation({
    mutationFn: async (bookId) => {
      await api.delete(`/books/${bookId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['books']);
      toast.success('Book deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete book');
    },
  });

  const handleEdit = (book) => {
    setSelectedBook(book);
    setIsModalOpen(true);
  };

  const handleDelete = async (bookId) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      try {
        await deleteBookMutation.mutateAsync(bookId);
      } catch (error) {
        console.error('Error deleting book:', error);
      }
    }
  };

  const handleAddBook = () => {
    setSelectedBook(null);
    setIsModalOpen(true);
  };

  const filteredBooks = books?.filter((book) =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.isbn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Books</h1>
          <p className="text-gray-600 mt-1">Browse and manage library books</p>
        </div>
        {isAdmin && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddBook}
            className="btn btn-primary flex items-center space-x-2"
          >
            <FiPlus className="h-5 w-5" />
            <span>Add New Book</span>
          </motion.button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by title, author, ISBN, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks?.map((book) => (
            <BookCard
              key={book.book_id}
              book={book}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {filteredBooks?.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No books found
        </div>
      )}

      {isModalOpen && (
        <BookModal
          book={selectedBook}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedBook(null);
          }}
        />
      )}
    </div>
  );
};

export default Books; 