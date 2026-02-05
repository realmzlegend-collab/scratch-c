import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaPlay, FaClock, FaDollarSign, FaFire, FaFilter } from 'react-icons/fa';
import { GiMoneyStack } from 'react-icons/gi';

const Ads = () => {
  const { user, updateBalance } = useAuth();
  const [ads, setAds] = useState([]);
  const [filteredAds, setFilteredAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingAd, setViewingAd] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAds();
  }, []);

  useEffect(() => {
    filterAds();
  }, [ads, filter]);

  const fetchAds = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/ads');
      setAds(res.data.ads || []);
    } catch (error) {
      toast.error('Error loading ads');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterAds = () => {
    let filtered = [...ads];
    
    if (filter === 'video') {
      filtered = filtered.filter(ad => ad.type === 'video');
    } else if (filter === 'survey') {
      filtered = filtered.filter(ad => ad.type === 'survey');
    } else if (filter === 'high_reward') {
      filtered = filtered.filter(ad => ad.reward >= 1);
    } else if (filter === 'quick') {
      filtered = filtered.filter(ad => ad.requirements.duration <= 30);
    }
    
    setFilteredAds(filtered);
  };

  const startViewingAd = (ad) => {
    if (viewingAd) return;
    
    setViewingAd(ad);
    setCountdown(ad.requirements.duration);
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          completeAdView(ad);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const completeAdView = async (ad) => {
    try {
      const res = await axios.post(`/api/ads/view/${ad._id}`);
      
      toast.success(`You earned $${ad.reward}!`);
      updateBalance(res.data.newBalance);
      
      // Update ads list
      const updatedAds = ads.map(a => 
        a._id === ad._id ? { ...a, currentDailyViews: a.currentDailyViews + 1 } : a
      );
      setAds(updatedAds);
      
      setViewingAd(null);
      setCountdown(0);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error viewing ad');
      setViewingAd(null);
      setCountdown(0);
    }
  };

  const cancelViewing = () => {
    setViewingAd(null);
    setCountdown(0);
    toast.error('Ad viewing cancelled');
  };

  const adCategories = [
    { id: 'all', name: 'All Ads', icon: <GiMoneyStack /> },
    { id: 'video', name: 'Video Ads', icon: <FaPlay /> },
    { id: 'survey', name: 'Surveys', icon: <FaFilter /> },
    { id: 'high_reward', name: 'High Reward', icon: <FaDollarSign /> },
    { id: 'quick', name: 'Quick Tasks', icon: <FaClock /> }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 text-white mb-8">
        <h1 className="text-3xl font-bold mb-2">Watch Ads & Earn Money</h1>
        <p className="text-purple-100">
          Available Balance: <span className="font-bold">${user?.balance?.toFixed(2)}</span>
        </p>
        <p className="text-purple-100">
          Total Ad Views: <span className="font-bold">{user?.adViews || 0}</span>
        </p>
      </div>

      {/* Ad Viewing Modal */}
      {viewingAd && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-6 relative">
                <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
                <div className="absolute inset-4 border-4 border-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-purple-600">{countdown}</span>
                </div>
              </div>
              
              <h3 className="text-xl font-bold mb-2">Watching: {viewingAd.title}</h3>
              <p className="text-gray-600 mb-4">Please wait {countdown} seconds to earn ${viewingAd.reward}</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => completeAdView(viewingAd)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-lg font-bold hover:opacity-90 transition"
                >
                  Complete Now
                </button>
                <button
                  onClick={cancelViewing}
                  className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
              
              <p className="text-sm text-gray-500 mt-4">
                Do not close this window or you won't get paid!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {adCategories.map(category => (
          <button
            key={category.id}
            onClick={() => setFilter(category.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              filter === category.id
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.icon}
            {category.name}
          </button>
        ))}
      </div>

      {/* Ads Grid */}
      {filteredAds.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAds.map(ad => (
            <div key={ad._id} className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Ad Image */}
              <div className="h-48 overflow-hidden">
                <img 
                  src={ad.image} 
                  alt={ad.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              
              {/* Ad Content */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold mb-1">{ad.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <FaClock />
                      <span>{ad.requirements.duration}s</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-lg font-bold">
                    ${ad.reward}
                  </div>
                </div>
                
                <p className="text-gray-600 mb-4">{ad.description}</p>
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <FaFire />
                    <span>{ad.totalViews} views</span>
                  </div>
                  <div>
                    <span className="text-yellow-600 font-medium">
                      {ad.currentDailyViews}/{ad.dailyLimit} today
                    </span>
                  </div>
                </div>
                
                {/* Requirements */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Requirements:</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      Level {ad.requirements.minLevel}+
                    </span>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                      {ad.requirements.maxViewsPerDay}/day
                    </span>
                    {ad.type === 'video' && (
                      <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                        Video
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Action Button */}
                <button
                  onClick={() => startViewingAd(ad)}
                  disabled={viewingAd || ad.currentDailyViews >= ad.dailyLimit}
                  className={`w-full py-3 rounded-lg font-bold transition ${
                    viewingAd || ad.currentDailyViews >= ad.dailyLimit
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90'
                  }`}
                >
                  {viewingAd ? 'Watching Ad...' : 
                   ad.currentDailyViews >= ad.dailyLimit ? 'Limit Reached' : 
                   `Watch & Earn $${ad.reward}`}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <GiMoneyStack className="text-4xl text-gray-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">No Ads Available</h3>
          <p className="text-gray-600 mb-6">
            Check back later for new earning opportunities
          </p>
          <button
            onClick={fetchAds}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:opacity-90 transition"
          >
            Refresh Ads
          </button>
        </div>
      )}

      {/* Tips Section */}
      <div className="mt-12 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6">
        <h3 className="text-xl font-bold mb-4">💡 Earning Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg">
            <h4 className="font-bold mb-2">Watch Regularly</h4>
            <p className="text-sm text-gray-600">
              Check back daily for new ads. Higher levels unlock better paying ads.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <h4 className="font-bold mb-2">Complete Surveys</h4>
            <p className="text-sm text-gray-600">
              Surveys pay more than regular ads. Be honest for better matches.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <h4 className="font-bold mb-2">Refer Friends</h4>
            <p className="text-sm text-gray-600">
              Earn 20% commission on all referrals' earnings. Unlimited potential!
            </p>
          </div>
        </div>
      </div>

      {/* AdSense Ad */}
      <div className="mt-8 bg-white rounded-xl p-6 shadow-lg text-center">
        <div className="mb-4">
          <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.REACT_APP_ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"></script>
          <ins className="adsbygoogle"
            style={{display: 'block'}}
            data-ad-client={process.env.REACT_APP_ADSENSE_CLIENT_ID}
            data-ad-slot={process.env.REACT_APP_ADSENSE_SLOT}
            data-ad-format="auto"
            data-full-width-responsive="true"></ins>
          <script>
            (adsbygoogle = window.adsbygoogle || []).push({});
          </script>
        </div>
        <p className="text-sm text-gray-500">Advertisement</p>
      </div>
    </div>
  );
};

export default Ads;
