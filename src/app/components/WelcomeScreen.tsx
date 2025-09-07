import React from 'react';
import { PhoneIcon, ChatBubbleIcon, GearIcon } from '@radix-ui/react-icons';

interface WelcomeScreenProps {
  onQuickConnect: () => void;
  sessionStatus: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';
}

export default function WelcomeScreen({ onQuickConnect, sessionStatus }: WelcomeScreenProps) {
  const isConnecting = sessionStatus === 'CONNECTING';

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          {/* Logo/Header */}
          <div className="mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <PhoneIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Jay's Frames</h1>
            <p className="text-gray-600">Custom Picture Framing in Houston</p>
          </div>

          {/* Quick Connect */}
          <div className="mb-6">
            <button
              onClick={onQuickConnect}
              disabled={isConnecting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <PhoneIcon className="w-5 h-5" />
                  Start Voice Chat
                </>
              )}
            </button>
          </div>

          {/* Features */}
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center gap-3">
              <ChatBubbleIcon className="w-4 h-4 text-blue-600" />
              <span>Get help with custom framing projects</span>
            </div>
            <div className="flex items-center gap-3">
              <GearIcon className="w-4 h-4 text-blue-600" />
              <span>Schedule design consultations</span>
            </div>
            <div className="flex items-center gap-3">
              <PhoneIcon className="w-4 h-4 text-blue-600" />
              <span>Check order status and more</span>
            </div>
          </div>

          {/* Business Hours */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-xs text-gray-500">
            <div className="font-medium mb-1">Business Hours</div>
            <div>Mon-Fri: 10am-6pm</div>
            <div>Sat: 11am-5pm • Sun: Closed</div>
            <div className="mt-2">(832) 893-3794</div>
          </div>
        </div>
      </div>
    </div>
  );
}