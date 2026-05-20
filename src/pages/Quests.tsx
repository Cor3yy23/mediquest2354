import { ArrowLeft, CheckCircle2, Clock, Trophy, Pill, UserCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Progress } from '../components/ui/progress';
import { useState } from 'react';

export function QuestsPage() {
  const navigate = useNavigate();
  const [isChildAccount] = useState(true); // Simulating child account for demo
  const [pendingApprovals, setPendingApprovals] = useState<number[]>([]);

  const quests = [
    {
      id: 1,
      medication: 'Aspirin',
      dose: '1 tablet (81mg)',
      time: '8:00 AM',
      xp: 100,
      status: 'completed' as const,
      currentStep: 1,
      totalSteps: 1,
    },
    {
      id: 2,
      medication: 'Metformin',
      dose: '500mg',
      time: '9:00 AM',
      xp: 50,
      status: 'completed' as const,
      currentStep: 2,
      totalSteps: 3,
    },
    {
      id: 3,
      medication: 'Lisinopril',
      dose: '10mg',
      time: '12:00 PM',
      xp: 100,
      status: 'pending' as const,
      currentStep: 1,
      totalSteps: 1,
    },
    {
      id: 4,
      medication: 'Metformin',
      dose: '500mg',
      time: '2:00 PM',
      xp: 50,
      status: 'pending' as const,
      currentStep: 3,
      totalSteps: 3,
    },
    {
      id: 5,
      medication: 'Vitamin D',
      dose: '2000 IU',
      time: '6:00 PM',
      xp: 75,
      status: 'pending' as const,
      currentStep: 1,
      totalSteps: 1,
    },
    {
      id: 6,
      medication: 'Atorvastatin',
      dose: '20mg',
      time: '9:00 PM',
      xp: 100,
      status: 'pending' as const,
      currentStep: 1,
      totalSteps: 2,
    },
  ];

  const completedQuests = quests.filter(q => q.status === 'completed').length;
  const totalXP = quests.reduce((sum, q) => sum + q.xp, 0);
  const earnedXP = quests.filter(q => q.status === 'completed').reduce((sum, q) => sum + q.xp, 0);
  const progressPercent = (earnedXP / totalXP) * 100;

  const handleQuestAction = (questId: number) => {
    if (isChildAccount) {
      setPendingApprovals([...pendingApprovals, questId]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1620] via-[#1a2332] to-[#0f1620] p-8">
      {/* Header with Back Button */}
      <div className="max-w-7xl mx-auto mb-8">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[#f59e0b] hover:text-[#fbbf24] mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-semibold">Back to Main Menu</span>
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#f59e0b] text-sm uppercase tracking-wider mb-2">Medication Tracking</p>
            <h1 className="text-white text-5xl font-bold">Daily Quests</h1>
          </div>
          
          <div className="bg-gradient-to-br from-[#1a2332] to-[#0f1620] border-2 border-[#f59e0b] rounded-lg p-6 min-w-[280px] shadow-lg">
            <p className="text-gray-400 text-sm mb-2">Today's Progress</p>
            <p className="text-white text-2xl font-bold mb-3">{completedQuests} / {quests.length} Completed</p>
            <Progress value={(completedQuests / quests.length) * 100} className="h-2 mb-3" />
            <p className="text-[#fbbf24] font-semibold">{earnedXP} / {totalXP} XP Earned</p>
          </div>
        </div>
      </div>

      {/* Child Account Notice */}
      {isChildAccount && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-gradient-to-r from-[#3b82f6]/20 to-[#8b5cf6]/20 border-2 border-[#3b82f6] rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#3b82f6] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-white font-semibold mb-1">Child Account Mode</h3>
              <p className="text-gray-300 text-sm">Quest completions require parent approval. Click "Request Approval" after taking your medication.</p>
            </div>
          </div>
        </div>
      )}

      {/* Quest List */}
      <div className="max-w-7xl mx-auto">
        <div className="grid gap-4">
          {quests.map((quest) => {
            const isPendingApproval = pendingApprovals.includes(quest.id);
            
            return (
              <div 
                key={quest.id}
                className={`bg-gradient-to-br from-[#1a2332] to-[#0f1620] border-2 ${
                  quest.status === 'completed' 
                    ? 'border-[#10b981] bg-green-950/20' 
                    : isPendingApproval
                    ? 'border-[#fbbf24] bg-yellow-950/20'
                    : 'border-[#3d5a80] hover:border-[#f59e0b]'
                } rounded-lg p-6 transition-all shadow-lg`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Quest Icon */}
                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                      quest.status === 'completed' 
                        ? 'bg-gradient-to-br from-[#10b981] to-[#14b8a6] text-white shadow-lg' 
                        : isPendingApproval
                        ? 'bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-white shadow-lg animate-pulse'
                        : 'bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] text-white shadow-lg'
                    }`}>
                      {quest.status === 'completed' ? (
                        <CheckCircle2 className="w-8 h-8" />
                      ) : isPendingApproval ? (
                        <UserCheck className="w-8 h-8" />
                      ) : (
                        <Pill className="w-8 h-8" />
                      )}
                    </div>

                    {/* Quest Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`text-2xl font-semibold ${
                          quest.status === 'completed' ? 'text-[#10b981]' : 'text-white'
                        }`}>
                          Take {quest.medication}
                        </h3>
                        {quest.status === 'completed' && (
                          <span className="px-3 py-1 bg-gradient-to-r from-[#10b981] to-[#14b8a6] text-white text-xs font-semibold rounded-full uppercase shadow-lg">
                            Completed
                          </span>
                        )}
                        {isPendingApproval && (
                          <span className="px-3 py-1 bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] text-white text-xs font-semibold rounded-full uppercase shadow-lg animate-pulse">
                            Pending Approval
                          </span>
                        )}
                        {quest.totalSteps > 1 && (
                          <span className="px-3 py-1 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white text-xs font-semibold rounded-full shadow-lg">
                            Step {quest.currentStep}/{quest.totalSteps}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-gray-400">
                        <div className="flex items-center gap-2">
                          <Pill className="w-4 h-4" />
                          <span className="text-sm font-medium">{quest.dose}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium">{quest.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-[#fbbf24]" />
                          <span className="text-[#fbbf24] font-semibold text-sm">{quest.xp} XP</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  {quest.status === 'pending' && !isPendingApproval && (
                    <button 
                      onClick={() => handleQuestAction(quest.id)}
                      className="ml-6 px-8 py-3 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] hover:from-[#2563eb] hover:to-[#7c3aed] text-white rounded-lg font-semibold transition-all shadow-lg"
                    >
                      {isChildAccount ? 'Request Approval' : 'Mark Complete'}
                    </button>
                  )}
                  {isPendingApproval && (
                    <div className="ml-6 px-8 py-3 bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg">
                      <UserCheck className="w-5 h-5" />
                      Awaiting Parent
                    </div>
                  )}
                  {quest.status === 'completed' && (
                    <div className="ml-6 px-8 py-3 bg-gradient-to-r from-[#10b981] to-[#14b8a6] text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg">
                      <CheckCircle2 className="w-5 h-5" />
                      Done
                    </div>
                  )}
                </div>

                {/* Multi-step Progress */}
                {quest.totalSteps > 1 && (
                  <div className="mt-4 pt-4 border-t border-[#2d4263]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-gray-400 text-sm">Daily Progress:</span>
                      <span className="text-white font-semibold text-sm">
                        {quest.status === 'completed' ? quest.currentStep : quest.currentStep - 1} / {quest.totalSteps} doses taken
                      </span>
                    </div>
                    <Progress 
                      value={quest.status === 'completed' 
                        ? (quest.currentStep / quest.totalSteps) * 100 
                        : ((quest.currentStep - 1) / quest.totalSteps) * 100
                      } 
                      className="h-2" 
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Card */}
        <div className="mt-8 bg-gradient-to-r from-[#3b82f6]/20 to-[#8b5cf6]/20 border-2 border-[#3b82f6]/50 rounded-lg p-6">
          <h3 className="text-[#3b82f6] font-semibold text-lg mb-2">Quest Tips</h3>
          <ul className="text-gray-300 space-y-1 text-sm">
            <li>• Complete quests on time to maintain your streak and earn bonus XP</li>
            <li>• Multi-dose medications are tracked throughout the day - complete all steps to maximize rewards</li>
            <li>• Share your progress with your party members for accountability and support</li>
            {isChildAccount && (
              <li>• <strong>Parent approval required:</strong> Your parent will review and approve your quest completions</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}