import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaPlayCircle, 
  FaUsers, 
  FaMoneyBillWave, 
  FaShieldAlt,
  FaRocket,
  FaChartLine,
  FaGift
} from 'react-icons/fa';
import { GiMoneyStack, GiTakeMyMoney } from 'react-icons/gi';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';

const Home = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPayout: 0,
    onlineUsers: 0
  });
  const [testimonials] = useState([
    {
      id: 1,
      name: "John D.",
      amount: "$350",
      text: "I earned $350 in my first week! This platform really works."
    },
    {
      id: 2,
      name: "Sarah M.",
      amount: "$520",
      text: "Perfect side hustle for students. Flexible and pays well."
    },
    {
      id: 3,
      name: "Mike T.",
      amount: "$1,250",
      text: "Best earning app I've tried. Withdrawals are instant!"
    }
  ]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/users/leaderboard');
      // You can add more stats endpoints as needed
      setStats(prev => ({
        ...prev,
        totalUsers: res.data.leaderboard.length
      }));
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const features = [
    {
      icon: <FaPlayCircle className="text-4xl text-purple-600" />,
      title: "Watch Ads",
      description: "Earn money by watching short video ads",
      earnings: "$0.10 - $5 per ad"
    },
    {
      icon: <FaUsers className="text-4xl text-blue-600" />,
      title: "Refer Friends",
      description: "Get 20% commission on referrals' earnings",
      earnings: "Unlimited earnings"
    },
    {
      icon: <FaMoneyBillWave className="text-4xl text-green-600" />,
      title: "Instant Withdrawal",
      description: "Withdraw your earnings instantly",
      earnings: "Minimum $100 withdrawal"
    },
    {
      icon: <FaShieldAlt className="text-4xl text-yellow-600" />,
      title: "Secure Platform",
      description: "Bank-level security for your earnings",
      earnings: "100% safe"
    }
  ];

  const steps = [
    { number: 1, title: "Sign Up Free", description: "Create your free account" },
    { number: 2, title: "Watch Ads", description: "Start watching ads to earn" },
    { number: 3, title: "Invite Friends", description: "Share your referral link" },
    { number: 4, title: "Withdraw Money", description: "Cash out your earnings" }
  ];

  return (
    <div>
      {/* Hero Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-12 md:py-20"
      >
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 gradient-text">
            Earn Money By Watching Ads
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of users earning real money every day. 
            Watch ads, complete tasks, refer friends and get paid instantly.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:opacity-90 transition"
                >
                  Go to Dashboard
                </Link>
                <Link
                  to="/ads"
                  className="bg-white text-purple-600 border-2 border-purple-600 px-8 py-3 rounded-lg font-bold text-lg hover:bg-purple-50 transition"
                >
                  Start Earning
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:opacity-90 transition"
                >
                  Start Earning Free
                </Link>
                <Link
                  to="/login"
                  className="bg-white text-purple-600 border-2 border-purple-600 px-8 py-3 rounded-lg font-bold text-lg hover:bg-purple-50 transition"
                >
                  Login
                </Link>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-center mb-4">
                <GiMoneyStack className="text-3xl text-green-500" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800">${stats.totalPayout.toLocaleString()}+</h3>
              <p className="text-gray-600">Total Paid to Users</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-center mb-4">
                <FaUsers className="text-3xl text-blue-500" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800">{stats.totalUsers.toLocaleString()}+</h3>
              <p className="text-gray-600">Active Users</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-center mb-4">
                <GiTakeMyMoney className="text-3xl text-purple-500" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800">$100+</h3>
              <p className="text-gray-600">Average Monthly Earnings</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section className="py-12">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose ScratchEarn?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-600 mb-4">{feature.description}</p>
              <p className="text-green-600 font-bold">{feature.earnings}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 bg-gradient-to-r from-purple-50 to-blue-50 rounded-3xl my-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12">
        <h2 className="text-3xl font-bold text-center mb-12">What Our Users Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {testimonial.name.charAt(0)}
                </div>
                <div className="ml-4">
                  <h4 className="font-bold">{testimonial.name}</h4>
                  <p className="text-green-600 font-bold">{testimonial.amount} earned</p>
                </div>
              </div>
              <p className="text-gray-600 italic">"{testimonial.text}"</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 text-center">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl p-8 md:p-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Start Earning?
          </h2>
          <p className="text-purple-100 mb-8 text-lg">
            Join now and get $5 free bonus on signup!
          </p>
          <Link
            to={user ? "/ads" : "/register"}
            className="inline-block bg-white text-purple-600 px-8 py-3 rounded-lg font-bold text-lg hover:bg-purple-50 transition"
          >
            {user ? "Start Watching Ads" : "Get Started Free"}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
