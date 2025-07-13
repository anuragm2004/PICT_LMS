import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { format } from "date-fns";
import { FiBook, FiClock, FiDollarSign, FiActivity } from "react-icons/fi";
import api from "../../services/api";
import ConfirmationModal from "../../components/ConfirmationModal";
import { useState } from "react";

const Profile = () => {
  const { user } = useAuth();
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });

  const { data: profileData, isLoading, error } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      try {
        const response = await api.get("/users/profile");
        if (!response.data.success) {
          throw new Error(response.data.message || "Failed to fetch profile data");
        }
        return response.data.data;
      } catch (error) {
        console.error("Error fetching profile:", error);
        setErrorModal({
          isOpen: true,
          title: "Error",
          message: error.response?.data?.message || "Failed to load profile data. Please try again later.",
        });
        throw error;
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">
          Error loading profile. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* User Details */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Profile Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">Name</p>
            <p className="font-medium">{profileData.user.name}</p>
          </div>
          <div>
            <p className="text-gray-600">Email</p>
            <p className="font-medium">{profileData.user.email}</p>
          </div>
          <div>
            <p className="text-gray-600">Phone</p>
            <p className="font-medium">{profileData.user.phone || "Not provided"}</p>
          </div>
          <div>
            <p className="text-gray-600">Account Type</p>
            <p className="font-medium">{profileData.user.kind}</p>
          </div>
        </div>
      </div>

      {/* Show additional sections only for STUDENT users */}
      {user?.kind === 'STUDENT' && (
        <>
          {/* Current Issues */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <FiBook className="text-blue-500" />
              <h2 className="text-2xl font-semibold">Current Issues</h2>
            </div>
            {profileData.currentIssues.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profileData.currentIssues.map((issue) => (
                  <div
                    key={issue.issue_record_id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-medium mb-2">{issue.Book.title}</h3>
                    <p className="text-gray-600 text-sm mb-2">
                      by {issue.Book.author}
                    </p>
                    <p className="text-sm">
                      Due: {format(new Date(issue.due_date), "MMMM d, yyyy")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No current issues</p>
            )}
          </div>

          {/* Pending Payments */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <FiDollarSign className="text-yellow-500" />
              <h2 className="text-2xl font-semibold">Pending Payments</h2>
            </div>
            {profileData.pendingPayments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profileData.pendingPayments.map((payment) => (
                  <div
                    key={payment.payment_id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <p className="font-medium mb-2">₹{payment.amount}</p>
                    <p className="text-sm text-gray-600">
                      Status: {payment.status}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No pending payments</p>
            )}
          </div>

          {/* Issue History */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <FiActivity className="text-green-500" />
              <h2 className="text-2xl font-semibold">Issue History</h2>
            </div>
            {profileData.issueHistory.length > 0 ? (
              <div className="space-y-4">
                {profileData.issueHistory.map((issue) => (
                  <div
                    key={issue.issue_record_id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-medium mb-2">{issue.Book.title}</h3>
                    <p className="text-gray-600 text-sm mb-2">
                      by {issue.Book.author}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <p>
                        Issued: {format(new Date(issue.issue_date), "MMMM d, yyyy")}
                      </p>
                      <p>
                        Returned: {format(new Date(issue.return_date), "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No issue history</p>
            )}
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiClock className="text-purple-500" />
              <h2 className="text-2xl font-semibold">Payment History</h2>
            </div>
            {profileData.paymentHistory.length > 0 ? (
              <div className="space-y-4">
                {profileData.paymentHistory.map((payment) => (
                  <div
                    key={payment.payment_id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <p className="font-medium mb-2">₹{payment.amount}</p>
                    <p className="text-sm text-gray-600">
                      Status: {payment.status}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No payment history</p>
            )}
          </div>
        </>
      )}

      <ConfirmationModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
        title={errorModal.title}
        message={errorModal.message}
        type="error"
      />
    </div>
  );
};

export default Profile; 