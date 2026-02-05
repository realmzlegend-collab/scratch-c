import React from 'react';
import { FaTelegram, FaWhatsapp, FaFacebook, FaTwitter, FaInstagram } from 'react-icons/fa';
import { GiMoneyStack } from 'react-icons/gi';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <GiMoneyStack className="text-3xl text-purple-400" />
              <span className="text-2xl font-bold">ScratchEarn</span>
            </div>
            <p className="text-gray-400 mb-4">
              Earn money by watching ads, completing tasks, and referring friends. 
              Get paid directly to your bank account or mobile money.
            </p>
            <div className="flex space-x-4">
              <a 
                href="https://t.me/+60VfBwiQ5Z01Yjk0" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-400 transition"
              >
                <FaTelegram size={24} />
              </a>
              <a 
                href="https://chat.whatsapp.com/KGLi5AZqcH1FTxUoTscw2N" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-green-400 transition"
              >
                <FaWhatsapp size={24} />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-600 transition">
                <FaFacebook size={24} />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition">
                <FaTwitter size={24} />
              </a>
              <a href="#" className="text-gray-400 hover:text-pink-500 transition">
                <FaInstagram size={24} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="/" className="text-gray-400 hover:text-white transition">Home</a></li>
              <li><a href="/ads" className="text-gray-400 hover:text-white transition">Watch Ads</a></li>
              <li><a href="/withdraw" className="text-gray-400 hover:text-white transition">Withdraw</a></li>
              <li><a href="/referrals" className="text-gray-400 hover:text-white transition">Referrals</a></li>
              <li><a href="/leaderboard" className="text-gray-400 hover:text-white transition">Leaderboard</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-bold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition">Terms of Service</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">Cookie Policy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">Disclaimer</a></li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            © {currentYear} ScratchEarn. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            This site is protected by reCAPTCHA and the Google 
            <a href="https://policies.google.com/privacy" className="text-blue-400 ml-1">Privacy Policy</a> and
            <a href="https://policies.google.com/terms" className="text-blue-400 ml-1">Terms of Service</a> apply.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
