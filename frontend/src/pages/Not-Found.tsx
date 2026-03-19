import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Home, Search, Utensils } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Visual */}
        <div className="relative mb-8">
          <h1 className="text-8xl font-bold text-green-200 select-none">404</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <Utensils className="h-16 w-16 text-green-600" />
          </div>
        </div>

        {/* Error Message */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Oops! This ingredient isn't in our kitchen
        </h2>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          The page you're looking for might have expired, been moved, or doesn't exist. 
          Let's get you back to the fresh ingredients!
        </p>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Link
            to="/"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Home className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Link>
          
          <Link
            to="/marketplace"
            className="inline-flex items-center justify-center w-full px-6 py-3 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium"
          >
            <Search className="w-5 h-5 mr-2" />
            Browse Marketplace
          </Link>
        </div>

        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center mt-6 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Go back
        </button>

        {/* Fun Food Emoji */}
        <div className="mt-12 text-4xl opacity-20">
          🥬 🥕 🍅 🧅 🌶️
        </div>
      </div>
    </div>
  );
};

export default NotFound;