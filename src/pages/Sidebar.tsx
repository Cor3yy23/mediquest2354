import { useNavigate } from 'react-router';
import emblemImage from "figma:asset/388115b5ff0afcb1d8db00c948e985ea0d979056.png";
import { getRankByLevel } from '../utils/ranks';

export function Sidebar() {
  const navigate = useNavigate();
  const userLevel = 12; // Current user level
  const rank = getRankByLevel(userLevel);

  return (
    <div className="w-64 bg-gradient-to-b from-[#1e293b] to-[#0f172a] border-r-2 border-[#f59e0b] h-screen flex flex-col p-6">
      {/* User Profile - Clickable */}
      <div 
        onClick={() => navigate('/profile')}
        className="cursor-pointer mb-6 hover:opacity-80 transition-opacity"
      >
        <div className="relative">
          {/* Profile Picture with Rank Border */}
          <div className="relative mx-auto mb-3 w-20 h-20">
            <div className={`absolute inset-0 bg-gradient-to-br ${rank.borderGradient} rounded-lg p-1 ${rank.glowColor} animate-pulse`}>
              <div className="w-full h-full bg-gradient-to-br from-[#2d4263] to-[#1a2332] rounded-lg overflow-hidden">
                <img 
                  src={emblemImage} 
                  alt="User Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="w-20 h-20 bg-gradient-to-br from-[#2d4263] to-[#1a2332] border-2 border-[#4a6fa5] rounded-lg overflow-hidden">
              <img 
                src={emblemImage} 
                alt="User Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            {/* Rank Badge */}
            <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gradient-to-r ${rank.borderGradient} rounded-full text-[10px] font-bold text-white uppercase whitespace-nowrap shadow-lg`}>
              {rank.name}
            </div>
          </div>
          
          {/* User Info */}
          <div className="text-center">
            <h3 className="text-white font-semibold text-lg">MediQuest</h3>
            <p className="text-gray-400 text-sm">By North Oaks</p>
            <p className="text-gray-400 text-sm">Health System</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-2">
        <button 
          onClick={() => navigate('/')}
          className="w-full text-left px-4 py-3 bg-gradient-to-r from-[#f59e0b] to-[#ef4444] hover:from-[#ea580c] hover:to-[#dc2626] text-white rounded-full font-semibold uppercase text-sm tracking-wider transition-all shadow-lg"
        >
          Main Menu
        </button>
        <button 
          onClick={() => navigate('/quests')}
          className="w-full text-left px-4 py-3 bg-gradient-to-r from-[#1e293b] to-[#0f172a] hover:from-[#3b82f6] hover:to-[#8b5cf6] text-white rounded-full font-semibold uppercase text-sm tracking-wider transition-all border border-[#3d5a80]">
          Quests
        </button>
        <button 
          onClick={() => navigate('/meds')}
          className="w-full text-left px-4 py-3 bg-gradient-to-r from-[#1e293b] to-[#0f172a] hover:from-[#10b981] hover:to-[#14b8a6] text-white rounded-full font-semibold uppercase text-sm tracking-wider transition-all border border-[#3d5a80]">
          Meds
        </button>
        <button 
          onClick={() => navigate('/party')}
          className="w-full text-left px-4 py-3 bg-gradient-to-r from-[#1e293b] to-[#0f172a] hover:from-[#a855f7] hover:to-[#ec4899] text-white rounded-full font-semibold uppercase text-sm tracking-wider transition-all border border-[#3d5a80]">
          Party
        </button>
        <button 
          onClick={() => navigate('/unlocks')}
          className="w-full text-left px-4 py-3 bg-gradient-to-r from-[#1e293b] to-[#0f172a] hover:from-[#fbbf24] hover:to-[#f59e0b] text-white rounded-full font-semibold uppercase text-sm tracking-wider transition-all border border-[#3d5a80]">
          Unlocks
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className="w-full text-left px-4 py-3 bg-gradient-to-r from-[#1e293b] to-[#0f172a] hover:from-[#3b82f6] hover:to-[#8b5cf6] text-white rounded-full font-semibold uppercase text-sm tracking-wider transition-all border border-[#3d5a80]"
        >
          Profile
        </button>
      </nav>

      {/* Account Info & Log Out */}
      <div className="mt-auto pt-6 border-t border-[#f59e0b]">
        <div className="mb-4">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Signed in as</p>
          <p className="text-white font-semibold uppercase text-sm tracking-wider">Brice · Parent</p>
          <p className="text-white font-semibold uppercase text-sm tracking-wider">Account</p>
        </div>
        <button className="w-full px-4 py-2 bg-gradient-to-r from-[#ef4444] to-[#dc2626] hover:from-[#dc2626] hover:to-[#b91c1c] text-white rounded-lg text-sm font-semibold transition-all shadow-lg">
          Log Out
        </button>
      </div>

      {/* Bottom XP Bar */}
      <div className="mt-4 p-3 bg-gradient-to-r from-[#1e293b] to-[#0f172a] border border-[#f59e0b] rounded-lg">
        <p className="text-gray-400 text-xs uppercase mb-1">Personal XP</p>
        <p className="text-white font-semibold text-sm">Level {userLevel} · 0 / 500 XP</p>
      </div>
    </div>
  );
}