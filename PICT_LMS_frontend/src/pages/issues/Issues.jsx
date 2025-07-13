import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiFilter, FiEdit2, FiRefreshCw } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import IssueModal from './IssueModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { useAuth } from '../../context/AuthContext';

const IssueCard = ({ issue, onEdit, onRenew, isAdmin }) => (
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
          title={issue.Book.title}
        >
          {issue.Book.title}
        </h3>
        <p 
          className="text-sm text-gray-600 mt-1 truncate cursor-help" 
          title={issue.Book.author}
        >
          {issue.Book.author}
        </p>
      </div>
      {isAdmin && (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(issue)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200"
          >
            <FiEdit2 className="h-5 w-5" />
          </button>
          {!issue.returned && (
            <button
              onClick={() => onRenew(issue)}
              className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors duration-200"
            >
              <FiRefreshCw className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </div>
    
    {/* User Details Section */}
    <div className="mb-8 pl-2">
      <h4 className="text-sm font-medium text-gray-700 mb-3">Issued By</h4>
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium text-blue-600">
            {issue.User.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <p 
            className="text-sm font-medium text-gray-900 truncate cursor-help" 
            title={issue.User.name}
          >
            {issue.User.name}
          </p>
          <p 
            className="text-xs text-gray-500 truncate cursor-help" 
            title={issue.User.email}
          >
            {issue.User.email}
          </p>
        </div>
      </div>
    </div>
    
    {/* Issue Details Section */}
    <div className="grid grid-cols-2 gap-6 pl-2">
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">Issue Date</p>
        <p className="text-sm text-gray-900">
          {new Date(issue.issue_date).toLocaleDateString()}
        </p>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">Due Date</p>
        <p className="text-sm text-gray-900">
          {new Date(issue.due_date).toLocaleDateString()}
        </p>
      </div>
      {issue.returned && (
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">Return Date</p>
          <p className="text-sm text-gray-900">
            {new Date(issue.return_date).toLocaleDateString()}
          </p>
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">Status</p>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            issue.returned
              ? 'bg-green-100 text-green-800'
              : new Date(issue.due_date) < new Date()
              ? 'bg-red-100 text-red-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {issue.returned
            ? 'Returned'
            : new Date(issue.due_date) < new Date()
            ? 'Overdue'
            : 'Issued'}
        </span>
      </div>
    </div>
  </motion.div>
);

const Issues = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
    onConfirm: null
  });

  const queryClient = useQueryClient();
  const isAdmin = user?.kind === 'ADMIN';

  const { data: issues, isLoading, error } = useQuery({
    queryKey: ['issues'],
    queryFn: async () => {
      try {
        const response = await api.get(isAdmin ? '/issue-records' : `/issue-records/user/${user.user_id}`);
        return response.data.records || [];
      } catch (error) {
        console.error('Error fetching issues:', error);
        throw error;
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

  const filteredIssues = issues?.filter((issue) => {
    const matchesSearch =
      issue.Book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.Book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (isAdmin && issue.User.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'returned' && issue.returned) ||
      (statusFilter === 'overdue' && !issue.returned && new Date(issue.due_date) < new Date()) ||
      (statusFilter === 'issued' && !issue.returned && new Date(issue.due_date) >= new Date());

    return matchesSearch && matchesStatus;
  });

  const handleEdit = (issue) => {
    setSelectedIssue(issue);
    setIsModalOpen(true);
  };

  const handleRenew = async (issue) => {
    try {
      await api.put(`/issue-records/renew/${issue.issue_record_id}`);
      queryClient.invalidateQueries(['issues']);
      showMessage('success', 'Success', 'Book renewed successfully');
    } catch (error) {
      showMessage('error', 'Error', error.response?.data?.message || 'Failed to renew book');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedIssue(null);
  };

  const currentlyIssued = filteredIssues?.filter(
    (issue) => !issue.returned && new Date(issue.due_date) >= new Date()
  ) || [];

  const returnedBooks = filteredIssues?.filter((issue) => issue.returned) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {isAdmin ? 'Book Issues' : 'My Issues'}
        </h1>
        {isAdmin && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
          >
            Issue New Book
          </motion.button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={isAdmin ? "Search by book title, author, or user name" : "Search by book title or author"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiFilter className="h-5 w-5 text-gray-400" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input pl-10"
          >
            <option value="all">All Status</option>
            <option value="issued">Issued</option>
            <option value="returned">Returned</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Currently Issued Books Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Currently Issued Books</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentlyIssued.map((issue) => (
            <IssueCard
              key={issue.issue_record_id}
              issue={issue}
              onEdit={handleEdit}
              onRenew={handleRenew}
              isAdmin={isAdmin}
            />
          ))}
        </div>
        {currentlyIssued.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            No currently issued books found
          </div>
        )}
      </div>

      {/* Returned Books Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Returned Books</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {returnedBooks.map((issue) => (
            <IssueCard
              key={issue.issue_record_id}
              issue={issue}
              onEdit={handleEdit}
              onRenew={handleRenew}
              isAdmin={isAdmin}
            />
          ))}
        </div>
        {returnedBooks.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            No returned books found
          </div>
        )}
      </div>

      {isModalOpen && (
        <IssueModal
          issue={selectedIssue}
          onClose={handleCloseModal}
          onSuccess={(message) => showMessage('success', 'Success', message)}
          onError={(message) => showMessage('error', 'Error', message)}
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

export default Issues; 