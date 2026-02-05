import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaWallet, 
  FaChartLine, 
  FaUsers, 
  FaPlayCircle,
  FaArrowUp,
  FaArrowDown,
  FaHistory
} from 'react-icons/fa';
import { GiMoneyStack, GiReceiveMoney } from 'react-icons/gi';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todayEarnings: 0,
    weeklyEarnings: 0,
    totalEarned: 0,
    referrals: 0,
    adViews: 0
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [transactionsRes, referralsRes, adsRes] = await Promise.all([
        axios.get('/api/payments/transactions'),
        axios.get('/api/users/referrals'),
        axios.get('/api/ads')
      ]);

      const transactions = transactionsRes.data.transactions || [];
      const today = new Date().toDateString();
      
      const todayEarnings = transactions
        .filter(t => new Date(t.createdAt).toDateString() === today && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      const weeklyEarnings = transactions
        .filter(t => {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return new Date(t.createdAt) > weekAgo && t.status === 'completed';
        })
        .reduce((sum, t) => sum + t.amount, 0);

      setStats({
        todayEarnings,
        weeklyEarnings,
        totalEarned: user?.totalEarned || 0,
        referrals: referralsRes.data.referrals?.length || 0,
        adViews: adsRes.data.userAdViews || 0
      });

      setRecentTransactions(transactions.slice(0, 5));
    } catch (error) {
      toast.error('Error loading dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: "Available Balance",
      value: `$${user?.balance?.toFixed(2) || '0.00'}`,
      icon: <FaWallet className="text-2xl text-green-500" />,
      color: "bg-gradient-to-r from-green-50 to-emerald-50",
      textColor: "text-green-700"
    },
    {
      title: "Today's Earnings",
      value: `$${stats.todayEarnings.toFixed(2)}`,
      icon: <GiMoneyStack className="text-2xl text-blue-500" />,
      color: "bg-gradient-to-r from-blue-50 to-cyan-50",
      textColor: "text-blue-700"
    },
    {
      title: "Total Earned",
      value: `$${stats.totalEarned.toFixed(2)}`,
      icon: <FaChartLine className="text-2xl text-purple-500" />,
      color: "bg-gradient-to-r from-purple-50 to-pink-50",
      textColor: "text-purple-700"
    },
    {
      title: "Referrals",
      value: stats.referrals,
      icon: <FaUsers className="text-2xl text-orange-500" />,
      color: "bg-gradient-to-r from-orange-50 to-yellow-50",
      textColor: "text-orange-700"
    }
  ];

  const quickActions = [
    {
      title: "Watch Ads",
      description: "Earn money by watching ads",
      icon: <FaPlayCircle className="text-3xl text-purple-600" />,
      link: "/ads",
      color: "from-purple-500 to-pink-500"
    },
    {
      title: "Withdraw",
      description: "Cash out your earnings",
      icon: <GiReceiveMoney className="text-3xl text-green-600" />,
      link: "/withdraw",
      color: "from-green-500 to-teal-500"
    },
    {
      title: "Refer Friends",
      description: "Earn 20% commission",
      icon: <FaUsers className="text-3xl text-blue-600" />,
      link: "/referrals",
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Transaction History",
      description: "View your earnings history",
      icon: <FaHistory className="text-3xl text-orange-600" />,
      link: "/profile",
      color: "from-orange-500 to-yellow-500"
    }
  ];

  const earningsChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Daily Earnings',
        data: [12, 19, 8, 15, 22, 18, 25],
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
      },
    ],
  };

  const earningsChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Weekly Earnings Trend',
      },
    },
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.username}!
        </h1>
        <p className="text-purple-100">
          You've earned ${stats.totalEarned.toFixed(2)} total. Keep going!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <div key={index} className={`${stat.color} rounded-xl p-6 shadow-lg`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-600 text-sm">{stat.title}</p>
                <h3 className={`text-2xl font-bold ${stat.textColor} mt-2`}>
                  {stat.value}
                </h3>
              </div>
              {stat.icon}
            </div>
            {index === 0 && (
              <Link 
                to="/withdraw" 
                className="inline-block bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
              >
                Withdraw Now
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow group"
            >
              <div className={`mb-4 w-12 h-12 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center text-white`}>
                {action.icon}
              </div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-purple-600 transition">
                {action.title}
              </h3>
              <p className="text-gray-600 text-sm">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Charts and Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Earnings Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-lg">
          <div className="h-64">
            <Bar data={earningsChartData} options={earningsChartOptions} />
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-bold mb-4">Recent Transactions</h3>
          <div className="space-y-4">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <div key={transaction._id} className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`font-bold ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'credit' ? '+' : '-'}${transaction.amount}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No transactions yet</p>
            )}
          </div>
          <Link 
            to="/profile" 
            className="block text-center mt-4 text-purple-600 hover:text-purple-700 font-medium"
          >
            View All Transactions →
          </Link>
        </div>
      </div>

      {/* Ad Views Progress */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold">Ad Views Progress</h3>
            <p className="text-gray-600">Level {Math.floor(stats.adViews / 10)}</p>
          </div>
          <span className="text-2xl font-bold text-purple-600">{stats.adViews}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all duration-500"
            style={{ width: `${(stats.adViews % 10) * 10}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {10 - (stats.adViews % 10)} more views to level up
        </p>
      </div>

      {/* Ad Banner */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-6 text-center">
        <h3 className="text-xl font-bold text-white mb-2">
          ⚡ Limited Time Offer!
        </h3>
        <p className="text-white mb-4">
          Get 2x earnings on all ads for the next 24 hours!
        </p>
        <Link
          to="/ads"
          className="inline-block bg-white text-orange-600 px-6 py-2 rounded-lg font-bold hover:bg-orange-50 transition"
        >
          Watch Ads Now
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
