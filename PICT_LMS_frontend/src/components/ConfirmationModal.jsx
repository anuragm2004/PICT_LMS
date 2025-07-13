import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  type = 'confirmation', // 'confirmation', 'error', or 'success'
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <FiAlertTriangle className="h-6 w-6 text-red-500" />;
      case 'success':
        return <FiCheckCircle className="h-6 w-6 text-green-500" />;
      default:
        return <FiAlertTriangle className="h-6 w-6 text-blue-500" />;
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'error':
        return 'bg-red-600 hover:bg-red-700';
      case 'success':
        return 'bg-green-600 hover:bg-green-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-xl shadow-xl w-full max-w-md"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getIcon()}
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors duration-200"
              >
                <FiX className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <p className="text-gray-600 mb-6">{message}</p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
              >
                {cancelText}
              </button>
              {type === 'confirmation' && (
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`px-4 py-2 text-white ${getButtonColor()} rounded-md transition-colors duration-200`}
                >
                  {confirmText}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ConfirmationModal; 