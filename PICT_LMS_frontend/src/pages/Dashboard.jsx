import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FiBook, FiUsers, FiBookOpen, FiAlertCircle, FiDollarSign, FiClock, FiCalendar, FiAward, FiGift, FiMail, FiPhone, FiUser } from 'react-icons/fi';
import api from '../services/api';
import ConfirmationModal from '../components/ConfirmationModal';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ title, value, icon: Icon, color, loading }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${color} relative overflow-hidden`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        {loading ? (
          <div className="animate-pulse h-8 w-24 bg-gray-200 rounded mt-1"></div>
        ) : (
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
        )}
      </div>
      <div className={`p-3 rounded-full ${color.replace('border', 'bg').replace('-600', '-100')}`}>
        <Icon className={`h-6 w-6 ${color.replace('border', 'text')}`} />
      </div>
    </div>
  </motion.div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: '',
    message: ''
  });

  const { data: stats, isLoading: isLoadingStats, error: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        const response = await api.get('/dashboard/stats');
        return response.data.stats;
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
      }
    },
    enabled: user?.kind === 'ADMIN' // Only fetch stats for admin users
  });

  const { data: recentIssues, isLoading: isLoadingIssues, error: issuesError } = useQuery({
    queryKey: ['recent-issues'],
    queryFn: async () => {
      try {
        const response = await api.get('/dashboard/recent-issues');
        return response.data.issues;
      } catch (error) {
        console.error('Error fetching recent issues:', error);
        throw error;
      }
    },
    enabled: user?.kind === 'ADMIN' // Only fetch recent issues for admin users
  });

  // Static news data for students
  const libraryNews = [
    {
      id: 1,
      title: "New Books Added",
      content: "120+ new titles added this month including \"AI Superpowers\" by Kai-Fu Lee and \"Clean Architecture\" by Robert C. Martin. Visit the New Arrivals shelf!",
      icon: FiBook,
      color: "text-blue-500"
    },
    {
      id: 2,
      title: "Research Paper Published",
      content: "Dr. Snehal Patil from the IT Department has published a paper on \"Quantum Neural Networks\" in IEEE Access. Now available in the Digital Library.",
      icon: FiBookOpen,
      color: "text-green-500"
    },
    {
      id: 3,
      title: "Extended Library Hours During Exams",
      content: "Library will remain open till 10 PM from April 25 to May 15 to support your exam preparations.",
      icon: FiClock,
      color: "text-purple-500"
    },
    {
      id: 4,
      title: "Workshop Announcement",
      content: "Attend our upcoming workshop: \"How to Write a Research Paper\" on May 3rd, 2025. Register now at the front desk.",
      icon: FiCalendar,
      color: "text-indigo-500"
    },
    {
      id: 5,
      title: "Book Donation Drive",
      content: "Over 200+ books donated by alumni are now available in the Open Access section. Free to borrow!",
      icon: FiGift,
      color: "text-amber-500"
    },
    {
      id: 6,
      title: "Monthly Book Review Contest",
      content: "Submit a review of any book you read from the library and win exciting prizes! Last date: April 30, 2025.",
      icon: FiAward,
      color: "text-red-500"
    }
  ];

  // Library contact information
  const libraryInfo = {
    hours: "Monday - Friday: 8:00 AM - 8:00 PM\nSaturday: 9:00 AM - 5:00 PM\nSunday: Closed",
    librarian: "Dr. Rajesh Kumar",
    phone: "+91 98765 43210",
    email: "librarian@pict.edu"
  };

  // Handle errors
  if (statsError || issuesError) {
    const error = statsError || issuesError;
    setErrorModal({
      isOpen: true,
      title: 'Error',
      message: error.response?.data?.message || 'An error occurred while fetching dashboard data'
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        {user?.kind === 'ADMIN' && (
          <p className="text-gray-600 mt-1">Welcome to your library management system</p>
        )}
      </div>

      {user?.kind === 'ADMIN' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Books"
              value={stats?.totalBooks?.toLocaleString() || 0}
              icon={FiBook}
              color="border-blue-600"
              loading={isLoadingStats}
            />
            <StatCard
              title="Total Students"
              value={stats?.totalStudents?.toLocaleString() || 0}
              icon={FiUsers}
              color="border-green-600"
              loading={isLoadingStats}
            />
            <StatCard
              title="Books Issued"
              value={stats?.booksIssued?.toLocaleString() || 0}
              icon={FiBookOpen}
              color="border-indigo-600"
              loading={isLoadingStats}
            />
            <StatCard
              title="Overdue Books"
              value={stats?.overdueBooks?.toLocaleString() || 0}
              icon={FiAlertCircle}
              color="border-red-600"
              loading={isLoadingStats}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Financial Overview</h2>
                <FiDollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Fine Collected</span>
                  {isLoadingStats ? (
                    <div className="animate-pulse h-6 w-24 bg-gray-200 rounded"></div>
                  ) : (
                    <span className="text-lg font-semibold text-gray-900">
                      ₹{stats?.totalRevenue?.toLocaleString() || 0}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pending Payments</span>
                  {isLoadingStats ? (
                    <div className="animate-pulse h-6 w-24 bg-gray-200 rounded"></div>
                  ) : (
                    <span className="text-lg font-semibold text-gray-900">
                      {stats?.pendingPayments?.toLocaleString() || 0}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Library Status</h2>
                <FiClock className="h-5 w-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Lost/Damaged Books</span>
                  {isLoadingStats ? (
                    <div className="animate-pulse h-6 w-24 bg-gray-200 rounded"></div>
                  ) : (
                    <span className="text-lg font-semibold text-gray-900">
                      {stats?.lostDamagedBooks?.toLocaleString() || 0}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Available Books</span>
                  {isLoadingStats ? (
                    <div className="animate-pulse h-6 w-24 bg-gray-200 rounded"></div>
                  ) : (
                    <span className="text-lg font-semibold text-gray-900">
                      {(stats?.totalBooks - stats?.booksIssued - stats?.lostDamagedBooks)?.toLocaleString() || 0}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Issues</h2>
            {isLoadingIssues ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-4">
                    <div className="h-12 w-12 bg-gray-200 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentIssues?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Book
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Issue Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentIssues.map((issue) => (
                      <tr key={issue.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {issue.book.title}
                          </div>
                          <div className="text-sm text-gray-500">{issue.book.author}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{issue.user.name}</div>
                          <div className="text-sm text-gray-500">{issue.user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(issue.issueDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              issue.status === 'issued'
                                ? 'bg-green-100 text-green-800'
                                : issue.status === 'overdue'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                No recent issues found
              </div>
            )}
          </motion.div>
        </>
      ) : (
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">PICT Library News</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {libraryNews.map((news) => (
                <motion.div
                  key={news.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: news.id * 0.1 }}
                  className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500"
                >
                  <div className="flex items-start">
                    <div className={`p-2 rounded-full bg-blue-100 mr-3 ${news.color.replace('text', 'bg').replace('-500', '-100')}`}>
                      <news.icon className={`h-5 w-5 ${news.color}`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{news.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{news.content}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Library Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="p-2 rounded-full bg-blue-100 mr-3">
                    <FiClock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Library Hours</h3>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{libraryInfo.hours}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="p-2 rounded-full bg-green-100 mr-3">
                    <FiUser className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Librarian</h3>
                    <p className="text-sm text-gray-600 mt-1">{libraryInfo.librarian}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="p-2 rounded-full bg-purple-100 mr-3">
                    <FiPhone className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Contact Number</h3>
                    <p className="text-sm text-gray-600 mt-1">{libraryInfo.phone}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="p-2 rounded-full bg-red-100 mr-3">
                    <FiMail className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Email</h3>
                    <p className="text-sm text-gray-600 mt-1">{libraryInfo.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
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

export default Dashboard; 