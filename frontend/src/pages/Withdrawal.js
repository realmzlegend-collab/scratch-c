import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  FaWallet, 
  FaCreditCard, 
  FaMobileAlt, 
  FaCheckCircle,
  FaHistory,
  FaExclamationTriangle
} from 'react-icons/fa';
import { GiMoneyStack, GiPayMoney } from 'react-icons/gi';

const Withdraw = () => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('paystack');
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    fetchWithdrawalHistory();
  }, []);

  const fetchWithdrawalHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await axios.get('/api/payments/transactions');
      const withdrawals = (res.data.transactions || [])
        .filter(t => t.type === 'withdrawal')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setWithdrawalHistory(withdrawals);
    } catch (error) {
      toast.error('Error loading withdrawal history');
      console.error(error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    
    if (!amount || amount < 100) {
      toast.error('Minimum withdrawal amount is $100');
      return;
    }
    
    if (user.balance < amount) {
      toast.error('Insufficient balance');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post('/api/payments/initialize', {
        amount: parseFloat(amount),
        email: user.email,
        paymentMethod
      });
      
      if (res.data.authorizationUrl) {
        window.location.href = res.data.authorizationUrl;
      } else {
        toast.error('Withdrawal initialization failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Withdrawal failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    {
      id: 'paystack',
      name: 'Paystack',
      description: 'Bank Transfer & Card',
      icon: <FaCreditCard className="text-2xl" />,
      minAmount: 100,
      fee: '2.5%',
      processing: 'Instant'
    },
    {
      id: 'mobile_money',
      name: 'Mobile Money',
      description: 'M-Pesa, Airtel Money, etc',
      icon: <FaMobileAlt className="text-2xl" />,
      minAmount: 50,
      fee: '3%',
      processing: '5-15 minutes'
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      description: 'Direct bank transfer',
      icon: <GiPayMoney className="text-2xl" />,
      minAmount: 200,
      fee: '2%',
      processing: '1-2 business days'
    }
  ];

  const quickAmounts = [100, 200, 500, 1000];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Withdraw Your Earnings</h1>
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-green-100">Available Balance</p>
            <p className="text-2xl font-bold">${user?.balance?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-green-100">Total Earned</p>
            <p className="text-2xl font-bold">${user?.totalEarned?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-green-100">Minimum Withdrawal</p>
            <p className="text-2xl font-bold">$100</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Withdrawal Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-6">Request Withdrawal</h2>
            
            {/* Payment Methods */}
            <div className="mb-8">
              <h3 className="font-bold mb-4">Select Payment Method</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {paymentMethods.map(method => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-4 rounded-lg border-2 transition ${
                      paymentMethod === method.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${
                        paymentMethod === method.id ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {method.icon}
                      </div>
                      <div className="text-left">
                        <p className="font-bold">{method.name}</p>
                        <p className="text-sm text-gray-600">{method.description}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 text-left">
                      <p>Min: ${method.minAmount}</p>
                      <p>Fee: {method.fee}</p>
                      <p>Processing: {method.processing}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Selection */}
            <div className="mb-8">
              <h3 className="font-bold mb-4">Select Amount</h3>
              <div className="flex flex-wrap gap-3 mb-4">
                {quickAmounts.map(quickAmount => (
                  <button
                    key={quickAmount}
                    onClick={() => setAmount(quickAmount.toString())}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      amount === quickAmount.toString()
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ${quickAmount}
                  </button>
                ))}
              </div>
              
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount (min $100)"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                  min="100"
                  step="1"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Available: ${user?.balance?.toFixed(2)} | Min: $100 | Max: $10,000
              </p>
            </div>

            {/* Fee Calculation */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Amount:</span>
                <span className="font-bold">${amount || '0'}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Processing Fee (2.5%):</span>
                <span className="font-bold">${(amount * 0.025).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>You Receive:</span>
                <span className="text-green-600">
                  ${((amount || 0) - (amount * 0.025)).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleWithdraw}
              disabled={loading || !amount || amount < 100 || user.balance < amount}
              className={`w-full py-3 rounded-lg font-bold text-lg transition ${
                loading || !amount || amount < 100 || user.balance < amount
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90'
              }`}
            >
              {loading ? 'Processing...' : 'Withdraw Now'}
            </button>

            {/* Important Notes */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <FaExclamationTriangle className="text-yellow-600 mt-1" />
                <div>
                  <p className="font-bold text-yellow-800 mb-2">Important Information</p>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Withdrawals are processed within 24 hours</li>
                    <li>• Minimum withdrawal amount is $100</li>
                    <li>• 2.5% processing fee applies to all withdrawals</li>
                    <li>• Ensure your payment details are correct</li>
                    <li>• Contact support if you encounter any issues</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Withdrawals */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FaHistory /> Recent Withdrawals
            </h3>
            
            {historyLoading ? (
              <div className="flex justify-center py-4">
                <div className="spinner"></div>
              </div>
            ) : withdrawalHistory.length > 0 ? (
              <div className="space-y-4">
                {withdrawalHistory.slice(0, 5).map(withdrawal => (
                  <div key={withdrawal._id} className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="font-medium">${withdrawal.amount}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(withdrawal.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      withdrawal.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : withdrawal.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {withdrawal.status}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No withdrawals yet</p>
            )}
          </div>

          {/* Withdrawal Tips */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4">💡 Tips for Faster Withdrawal</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-500 mt-1" />
                <span className="text-sm">Verify your email for instant processing</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-500 mt-1" />
                <span className="text-sm">Withdraw during business hours (9 AM - 5 PM)</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-500 mt-1" />
                <span className="text-sm">Keep your account active (watch ads regularly)</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-500 mt-1" />
                <span className="text-sm">Use Paystack for instant transfers</span>
              </li>
            </ul>
          </div>

          {/* Need Help */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Having issues with withdrawal? Contact our support team:
            </p>
            <div className="space-y-2">
              <a 
                href="https://t.me/+60VfBwiQ5Z01Yjk0"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-blue-500 text-white px-4 py-2 rounded-lg text-center hover:bg-blue-600 transition"
              >
                Telegram Support
              </a>
              <a 
                href="https://chat.whatsapp.com/KGLi5AZqcH1FTxUoTscw2N"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-green-500 text-white px-4 py-2 rounded-lg text-center hover:bg-green-600 transition"
              >
                WhatsApp Community
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Withdraw;
