import React, { useState } from 'react';
import { StopIcon, MobileIcon } from '@radix-ui/react-icons';

interface QuickConnectProps {
  sessionStatus: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';
  onConnect: () => void;
  onDisconnect: () => void;
  selectedAgentName: string;
  onAgentChange: (agentName: string) => void;
  availableAgents: string[];
}

export default function QuickConnect({
  sessionStatus,
  onConnect,
  onDisconnect,
  selectedAgentName,
  onAgentChange,
  availableAgents,
}: QuickConnectProps) {
  const [showMenu, setShowMenu] = useState(false);
  
  const isConnected = sessionStatus === 'CONNECTED';
  const isConnecting = sessionStatus === 'CONNECTING';

  const getStatusColor = () => {
    if (isConnected) return 'bg-green-500';
    if (isConnecting) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getStatusText = () => {
    if (isConnected) return 'Connected';
    if (isConnecting) return 'Connecting...';
    return 'Disconnected';
  };

  const handleConnect = () => {
    if (isConnected) {
      onDisconnect();
    } else if (!isConnecting) {
      onConnect();
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[280px]">
        {/* Status Indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
            <span className="text-sm font-medium text-gray-700">{getStatusText()}</span>
          </div>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            {showMenu ? '▼' : '▶'} Menu
          </button>
        </div>

        {/* Quick Connect Button */}
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
            isConnected
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400'
          }`}
        >
          {isConnected ? (
            <>
              <StopIcon className="w-4 h-4" />
              Disconnect
            </>
          ) : isConnecting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Connecting...
            </>
          ) : (
            <>
              <MobileIcon className="w-4 h-4" />
              Connect to Jay's Frames
            </>
          )}
        </button>

        {/* Expandable Menu */}
        {showMenu && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="space-y-3">
              {/* Agent Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agent Type
                </label>
                <select
                  value={selectedAgentName}
                  onChange={(e) => onAgentChange(e.target.value)}
                  disabled={isConnected}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  {availableAgents.map((agent) => (
                    <option key={agent} value={agent}>
                      {agent === 'chatAgent' ? 'Customer Service' : agent}
                    </option>
                  ))}
                </select>
              </div>

              {/* Business Info */}
              <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-md">
                <div className="font-medium mb-1">Jay's Frames - Houston</div>
                <div>📍 218 W. 27th St, Houston, TX 77008</div>
                <div>📞 (832) 893-3794</div>
                <div>🕒 Mon-Fri 10am-6pm, Sat 11am-5pm</div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={!isConnected}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
                >
                  <MobileIcon className="w-3 h-3" />
                  Voice Mode
                </button>
                <button
                  disabled={!isConnected}
                  className="flex items-center justify-center gap-1 px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
                >
                  💬 Text Mode
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}