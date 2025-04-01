import React from 'react'

interface AppCallsProps {
  openModal: boolean
  setModalState: React.Dispatch<React.SetStateAction<boolean>>
}

const AppCalls: React.FC<AppCallsProps> = ({ openModal, setModalState }) => {
  const leaderboardData = [
    { rank: 1, username: 'Player1', score: 120 },
    { rank: 2, username: 'Player2', score: 115 },
    { rank: 3, username: 'Player3', score: 110 },
    { rank: 4, username: 'Player4', score: 100 },
    { rank: 5, username: 'Player5', score: 95 },
  ] // Sample leaderboard data

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 transition-all ${
        openModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="relative w-full max-w-lg bg-gradient-to-r from-purple-700 to-blue-900 p-6 rounded-lg shadow-2xl transform transition-all scale-100 opacity-100">
        {/* Modal Close Button */}
        <button className="absolute top-2 right-2 text-white text-xl" onClick={() => setModalState(false)}>
          &times;
        </button>

        <h2 className="text-4xl font-bold text-center text-white neon-text">Leaderboard</h2>
        <div className="mt-4">
          <div className="grid grid-cols-3 gap-4 text-lg text-white">
            <div className="font-semibold">Rank</div>
            <div className="font-semibold">Username</div>
            <div className="font-semibold">Score</div>
          </div>

          {/* Leaderboard Entries */}
          {leaderboardData.map((player) => (
            <div key={player.rank} className="grid grid-cols-3 gap-4 mt-3 p-2 rounded-md bg-gray-800 border-2 border-cyber-pink">
              <div className="text-center text-yellow-500">{player.rank}</div>
              <div className="text-center">{player.username}</div>
              <div className="text-center text-cyber-blue">{player.score}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AppCalls
