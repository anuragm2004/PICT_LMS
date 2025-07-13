import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiDollarSign, FiUser, FiClock, FiCheckCircle, FiXCircle, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const Payments = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editTransactionId, setEditTransactionId] = useState('');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch payments based on user role
  const { data: payments, isLoading, error } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      try {
        const response = await api.get('/payments');
        return response.data.payments || [];
      } catch (error) {
        console.error('Error fetching payments:', error);
        toast.error('Failed to fetch payments');
        return [];
      }
    },
    enabled: user?.kind === 'ADMIN', // Only fetch all payments for admin
  });

  // Fetch user's own payments if not admin
  const { data: userPayments, isLoading: isLoadingUserPayments } = useQuery({
    queryKey: ['userPayments', user?.user_id],
    queryFn: async () => {
      try {
        const response = await api.get(`/payments/user/${user?.user_id}`);
        return response.data.payments || [];
      } catch (error) {
        console.error('Error fetching user payments:', error);
        toast.error('Failed to fetch your payments');
        return [];
      }
    },
    enabled: user?.kind !== 'ADMIN' && !!user?.user_id, // Only fetch for non-admin users
  });

  // Update payment status mutation
  const updatePaymentMutation = useMutation({
    mutationFn: async ({ paymentId, status, paymentMethod, transactionId }) => {
      const response = await api.post(`/payments/update/${paymentId}`, { 
        status,
        payment_method: paymentMethod,
        transaction_id: transactionId
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['userPayments'] });
      toast.success('Payment updated successfully');
      setIsEditModalOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to update payment: ${error.message}`);
    }
  });

  // Delete payment mutation
  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId) => {
      const response = await api.delete(`/payments/${paymentId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['userPayments'] });
      toast.success('Payment deleted successfully');
      setIsDeleteModalOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to delete payment: ${error.message}`);
    }
  });

  // Handle edit payment
  const handleEditPayment = (payment) => {
    setSelectedPayment(payment);
    setEditStatus(payment.status);
    setEditPaymentMethod(payment.payment_method || '');
    setEditTransactionId(payment.transaction_id || '');
    setIsEditModalOpen(true);
  };

  // Handle delete payment
  const handleDeletePayment = (payment) => {
    setSelectedPayment(payment);
    setIsDeleteModalOpen(true);
  };

  // Submit edit
  const handleSubmitEdit = () => {
    if (!selectedPayment || !editStatus) return;
    updatePaymentMutation.mutate({
      paymentId: selectedPayment.payment_id,
      status: editStatus,
      paymentMethod: editPaymentMethod,
      transactionId: editPaymentMethod === 'UPI' ? editTransactionId : null
    });
  };

  // Submit delete
  const handleSubmitDelete = () => {
    if (!selectedPayment) return;
    deletePaymentMutation.mutate(selectedPayment.payment_id);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'PAID':
        return <FiCheckCircle className="h-5 w-5" />;
      case 'PENDING':
        return <FiClock className="h-5 w-5" />;
      case 'FAILED':
        return <FiXCircle className="h-5 w-5" />;
      default:
        return <FiDollarSign className="h-5 w-5" />;
    }
  };

  // Filter payments based on search query and status filter
  const filteredPayments = (user?.kind === 'ADMIN' ? payments : userPayments)?.filter(payment => {
    const matchesSearch = 
      payment.payment_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.User?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.status.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        Error loading payments: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.kind === "ADMIN" ? "Dues" : "My Dues"}
          </h1>
          <p className="text-gray-600 mt-1">View and manage payment records</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 w-full">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by payment ID, user name, description, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>
          <div className="w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-full"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      {isLoading || isLoadingUserPayments ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  {user?.kind === 'ADMIN' && (
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <tr key={payment.payment_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.payment_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <FiUser className="h-4 w-4 text-gray-400 mr-1" />
                          {payment.User?.name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{payment.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                          <span className="mr-1">{getStatusIcon(payment.status)}</span>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.payment_method || 'Not specified'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.transaction_id || 'Not available'}
                      </td>
                      {user?.kind === 'ADMIN' && (
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex items-center justify-center gap-4">
                            <button
                              onClick={() => handleEditPayment(payment)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <FiEdit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeletePayment(payment)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <FiTrash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={user?.kind === 'ADMIN' ? "7" : "6"} className="px-6 py-4 text-center text-sm text-gray-500">
                      No payments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Payment Details</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Payment ID: {selectedPayment.payment_id}</p>
              <p className="text-sm text-gray-600 mb-1">User: {selectedPayment.User?.name || 'Unknown'}</p>
              <p className="text-sm text-gray-600 mb-1">Amount: ₹{selectedPayment.amount.toLocaleString()}</p>
              <p className="text-sm text-gray-600 mb-4">Current Status: {selectedPayment.status}</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="input w-full"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="PAID">Paid</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => {
                      setEditPaymentMethod(e.target.value);
                      if (e.target.value !== 'UPI') {
                        setEditTransactionId('');
                      }
                    }}
                    className="input w-full"
                  >
                    <option value="">Select Payment Method</option>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction ID
                  </label>
                  <input
                    type="text"
                    value={editTransactionId}
                    onChange={(e) => setEditTransactionId(e.target.value)}
                    placeholder={editPaymentMethod === 'UPI' ? "Enter UPI transaction ID" : "Not required for cash payments"}
                    className={`input w-full ${editPaymentMethod !== 'UPI' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    disabled={editPaymentMethod !== 'UPI'}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEdit}
                className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
                disabled={updatePaymentMutation.isPending}
              >
                {updatePaymentMutation.isPending ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Delete Payment</h2>
            <p className="mb-4 text-gray-600">
              Are you sure you want to delete this payment? This action cannot be undone.
            </p>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Payment ID: {selectedPayment.payment_id}</p>
              <p className="text-sm text-gray-600 mb-1">User: {selectedPayment.User?.name || 'Unknown'}</p>
              <p className="text-sm text-gray-600 mb-1">Amount: ₹{selectedPayment.amount.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Status: {selectedPayment.status}</p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDelete}
                className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700"
                disabled={deletePaymentMutation.isPending}
              >
                {deletePaymentMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments; 