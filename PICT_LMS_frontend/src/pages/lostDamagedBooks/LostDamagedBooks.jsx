import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiBook } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import LostDamagedBookModal from './LostDamagedBookModal';
import ConfirmationModal from '../../components/ConfirmationModal';

const LostDamagedBookCard = ({ record, onEdit }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-xl shadow-md overflow-hidden"
  >
    <div className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{record.book.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{record.book.author}</p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => onEdit(record)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200"
          >
            <FiEdit2 className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-gray-600">ISBN</p>
          <div className="flex items-center mt-1">
            <FiBook className="h-4 w-4 text-gray-400 mr-1" />
            <p className="text-sm text-gray-900">{record.book.isbn}</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">Quantity</p>
          <p className="text-sm text-gray-900">{record.quantity}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">Category</p>
          <p className="text-sm text-gray-900">{record.book.category}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">Publication</p>
          <p className="text-sm text-gray-900">{record.book.publication}</p>
        </div>
      </div>
    </div>
  </motion.div>
);

const LostDamagedBooks = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    type: 'confirmation',
    title: '',
    message: '',
    onConfirm: null
  });
  const queryClient = useQueryClient();

  // Fetch lost/damaged books
  const { data: records, isLoading, error } = useQuery({
    queryKey: ['lostDamagedBooks'],
    queryFn: async () => {
      try {
        const response = await api.get('/lost-damaged-books');
        console.log('Fetched records:', response.data);
        return response.data.records || [];
      } catch (error) {
        console.error('Error fetching lost/damaged books:', error);
        console.error('Error details:', error.response?.data);
        toast.error('Failed to fetch lost/damaged books');
        return [];
      }
    },
  });

  const handleEdit = (record) => {
    console.log('Editing record:', record);
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedRecord(null);
    setIsModalOpen(true);
  };

  const filteredRecords = records?.filter(record => 
    record.book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.book_id.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const showMessage = (type, title, message) => {
    setConfirmationModal({
      isOpen: true,
      type,
      title,
      message,
      onConfirm: null
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error loading records: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lost/Damaged Books</h1>
          <p className="text-gray-600 mt-1">Manage lost and damaged book records</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAdd}
          className="btn btn-primary flex items-center space-x-2"
        >
          <FiPlus className="h-5 w-5" />
          <span>Add New Record</span>
        </motion.button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by title, author, or book ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Records Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecords.map((record) => (
          <LostDamagedBookCard
            key={record.lost_damaged_book_id}
            record={record}
            onEdit={handleEdit}
          />
        ))}
      </div>

      {filteredRecords.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          No records found
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <LostDamagedBookModal
          record={selectedRecord}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRecord(null);
          }}
        />
      )}

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        message={confirmationModal.message}
        type={confirmationModal.type}
      />
    </div>
  );
};

export default LostDamagedBooks; 