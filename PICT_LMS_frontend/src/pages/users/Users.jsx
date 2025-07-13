import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiSearch, FiPlus, FiEdit2, FiTrash2, FiMail, FiPhone } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import UserModal from './UserModal';
import { useAuth } from '../../context/AuthContext';

const UserCard = ({ user, onEdit, onDelete, currentUserId }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 p-6"
  >
    {/* User Information Section */}
    <div className="flex items-start justify-between mb-8">
      <div className="max-w-[70%]">
        <h3 
          className="text-lg font-semibold text-gray-900 truncate cursor-help" 
          title={user.name}
        >
          {user.name}
        </h3>
        <p className={`text-sm mt-1 ${
          user.kind === 'ADMIN' ? 'text-blue-600' : 'text-green-600'
        }`}>
          {user.kind}
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <button 
          onClick={() => onEdit(user)}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-200"
        >
          <FiEdit2 className="h-5 w-5" />
        </button>
        <button 
          onClick={() => onDelete(user.user_id)}
          disabled={user.user_id === currentUserId}
          className={`p-2 rounded-md transition-colors duration-200 ${
            user.user_id === currentUserId
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-red-600 hover:bg-red-50'
          }`}
          title={user.user_id === currentUserId ? "You cannot delete your own account" : "Delete user"}
        >
          <FiTrash2 className="h-5 w-5" />
        </button>
      </div>
    </div>

    {/* User Details Section */}
    <div className="grid grid-cols-2 gap-6 pl-2">
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">Email</p>
        <div className="flex items-center">
          <FiMail className="h-4 w-4 text-gray-400 mr-1" />
          <p 
            className="text-sm text-gray-900 truncate cursor-help" 
            title={user.email}
          >
            {user.email}
          </p>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">Phone</p>
        <div className="flex items-center">
          <FiPhone className="h-4 w-4 text-gray-400 mr-1" />
          <p 
            className="text-sm text-gray-900 truncate cursor-help" 
            title={user.phone || 'N/A'}
          >
            {user.phone || 'N/A'}
          </p>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">User ID</p>
        <p 
          className="text-sm text-gray-900 truncate cursor-help" 
          title={user.user_id}
        >
          {user.user_id}
        </p>
      </div>
    </div>
  </motion.div>
);

const Users = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const response = await api.get('/users');
        return response.data;
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to fetch users. Please try again.');
        return [];
      }
    },
    enabled: currentUser?.kind === 'ADMIN', // Only fetch if user is admin
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      try {
        // Validate userId format
        if (!userId || typeof userId !== 'string' || !/^U\d+$/.test(userId)) {
          throw new Error('Invalid user ID format. User ID must be in the format "U" followed by numbers (e.g., U1, U2)');
        }

        console.log('Attempting to delete user:', userId);
        
        // The backend expects user_id in the format "U123456"
        const response = await api.delete(`/users/${userId}`);
        return response.data;
      } catch (error) {
        console.error('Error deleting user:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          userId: userId
        });
        
        // Extract the specific error message from the backend if available
        const errorMessage = error.response?.data?.message || error.message;
        const errorDetails = error.response?.data?.details || '';
        
        // Create a more descriptive error
        const enhancedError = new Error(errorMessage);
        enhancedError.details = errorDetails;
        enhancedError.status = error.response?.status;
        
        throw enhancedError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
    },
    onError: (error) => {
      console.error('Delete user error:', {
        message: error.message,
        details: error.details,
        status: error.status
      });
      
      // Display a more specific error message to the user
      if (error.details) {
        toast.error(`${error.message}: ${error.details}`);
      } else {
        toast.error(error.message || 'Failed to delete user. Please try again.');
      }
    }
  });

  const handleEdit = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (userId) => {
    // Prevent deleting own account
    if (userId === currentUser?.user_id) {
      toast.error('You cannot delete your own account');
      return;
    }

    // Validate userId format
    if (!userId || !/^U\d+$/.test(userId)) {
      toast.error('Invalid user ID format. User ID must be in the format "U" followed by numbers (e.g., U1, U2)');
      return;
    }

    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await deleteUserMutation.mutateAsync(userId);
      } catch (error) {
        // Error is already handled by mutation's onError
        console.error('Error in handleDelete:', error);
      }
    }
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const filteredUsers = users?.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // If user is not admin, show access denied message
  if (currentUser?.kind !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">Only administrators can manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">Manage library users</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAddUser}
          className="btn btn-primary flex items-center space-x-2"
        >
          <FiPlus className="h-5 w-5" />
          <span>Add New User</span>
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
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <UserCard 
              key={user.user_id} 
              user={user} 
              onEdit={handleEdit}
              onDelete={handleDelete}
              currentUserId={currentUser?.user_id}
            />
          ))}
        </div>
      )}

      {/* User Modal */}
      {isModalOpen && (
        <UserModal 
          user={selectedUser} 
          onClose={() => {
            setIsModalOpen(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

export default Users; 