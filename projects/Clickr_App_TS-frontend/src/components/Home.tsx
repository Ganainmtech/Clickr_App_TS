import { useEffect, useState } from 'react'

interface LeaderboardEntry {
  address: string
  score: number
  timestamp: number
}

export function Home() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])

  // Load leaderboard data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('clickrLeaderboard')
    if (savedData) {
      setLeaderboardData(JSON.parse(savedData))
    }
  }, [])

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold neon-text mb-8 text-center">Welcome to Clickr</h1>

        {/* Game Description */}
        <div className="bg-gray-900 bg-opacity-80 rounded-lg backdrop-blur-md border border-cyber-pink shadow-neon p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">About the Game</h2>
          <p className="text-gray-300 mb-4">
            Clickr is a fast-paced clicking game where you need to click the Algorand logo as quickly as possible. Miss the logo and you'll
            lose a heart. Run out of hearts and the game is over!
          </p>
          <p className="text-gray-300">Play in Web2 mode for fun, or connect your wallet to play in Web3 mode and earn rewards!</p>
        </div>

        {/* Leaderboard Section */}
        <div className="bg-gray-900 bg-opacity-80 rounded-lg backdrop-blur-md border border-cyber-pink shadow-neon p-6">
          <h2 className="text-2xl font-bold mb-6 text-center">Top Players</h2>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => {
              const entry = leaderboardData[index]
              return (
                <div key={index} className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <span className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}</span>
                    {entry ? (
                      <span className="font-bold">
                        {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                      </span>
                    ) : (
                      <span className="font-bold text-gray-500 italic">Waiting for players...</span>
                    )}
                  </div>
                  {entry ? <span className="text-xl">{entry.score} clicks</span> : <span className="text-xl text-gray-500">-</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
