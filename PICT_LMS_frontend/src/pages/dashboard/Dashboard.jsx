import React, { useEffect, useState } from "react";
import { useQuery } from "react-query";
import { FiBook } from "react-icons/fi";
import api from "../../services/api";

const { data: stats, isLoading: statsLoading } = useQuery({
  queryKey: ["dashboardStats"],
  queryFn: async () => {
    const response = await api.get("/dashboard/stats");
    return response.data.stats;
  },
  enabled: user?.kind === "ADMIN",
});

const Dashboard = () => {
  // ... existing code ...

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Available Books Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Available Books</p>
            <p className="text-2xl font-semibold text-gray-900">
              {statsLoading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                stats?.availableBooks || 0
              )}
            </p>
          </div>
          <div className="p-3 bg-green-100 rounded-full">
            <FiBook className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </div>
      {/* ... existing code ... */}
    </div>
  );
};

export default Dashboard; 