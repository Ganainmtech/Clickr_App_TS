import * as algokit from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import algosdk, { Transaction } from 'algosdk'
import { useEffect, useState } from 'react'
import algorandLogo from '../assets/algorand-logo-white.png'
import { ClickrLogicClient } from '../contracts/clickrLogic'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

// Smart contract configuration
const APP_ID = 1001n
const REWARD_MULTIPLIER = 0.006 // Cost per click in ALGO

interface PathPoint {
  id: number
  x: number
  y: number
  opacity: number
}

interface LeaderboardEntry {
  address: string
  score: number
  timestamp: number
}

export function ClickrGame() {
  const { activeAddress, signTransactions } = useWallet()
  const [score, setScore] = useState(0)
  const [hearts, setHearts] = useState(5)
  const [objectPosition, setObjectPosition] = useState({ top: '50%', left: '50%' })
  const [gameStarted, setGameStarted] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [animateClick, setAnimateClick] = useState(false)
  const [missedClick, setMissedClick] = useState(false)
  const [path, setPath] = useState<PathPoint[]>([])
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])

  const [isWeb3Mode, setIsWeb3Mode] = useState(false)
  const [isProcessingTxn, setIsProcessingTxn] = useState(false)
  const [txnStatus, setTxnStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const [isOptedIn, setIsOptedIn] = useState(false)
  const [isCheckingOptIn, setIsCheckingOptIn] = useState(false)
  const [isOptingIn, setIsOptingIn] = useState(false)
  const [optInStatus, setOptInStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  // Commenting out on-chain click count state
  // const [onChainClickCount, setOnChainClickCount] = useState<number | null>(null)

  // Initialize AlgoKit client
  const algorand = algokit.AlgorandClient.fromEnvironment()

  // Register signer when wallet is connected
  useEffect(() => {
    if (activeAddress && signTransactions) {
      const signer = async (txnGroup: Transaction[], indexesToSign: number[]) => {
        const txnsToSign = txnGroup.map((txn) => algosdk.encodeUnsignedTransaction(txn))
        const signedTxns = await signTransactions(txnsToSign)
        return signedTxns.filter((txn): txn is Uint8Array => txn !== null)
      }
      algorand.setSigner(activeAddress, signer)
    }
  }, [activeAddress, signTransactions])

  // Get app details and create client
  const getAppDetails = async (sender: string | null) => {
    if (!sender) {
      throw new Error('Sender address is required')
    }
    console.log('Getting app details for sender:', sender)

    try {
      // Create app client with the connected wallet address
      return algorand.client.getTypedAppClientById(ClickrLogicClient, {
        appId: BigInt(APP_ID),
        defaultSender: sender,
      })
    } catch (error) {
      console.error('Error getting account:', error)
      throw error
    }
  }

  // Calculate reward amount based on score
  const getRewardAmount = () => {
    return score * REWARD_MULTIPLIER
  }

  // Check if the user is opted into the app
  const checkOptIn = async (address: string | null) => {
    if (!address) return false
    console.log('Checking opt-in status for address:', address)
    try {
      const algodClient = algokit.getAlgoClient(getAlgodConfigFromViteEnvironment())
      const accountInfo = await algodClient.accountInformation(address).do()
      const optedIn = accountInfo.appsLocalState?.some((app) => BigInt(app.id) === APP_ID) ?? false
      console.log('Opt-in status:', optedIn)
      setIsOptedIn(optedIn)
      return optedIn
    } catch (error) {
      console.error('Error checking opt-in status:', error)
      return false
    }
  }

  // Fetch on-chain click count
  const fetchOnChainClickCount = async (sender: string | null) => {
    if (!sender) {
      throw new Error('Sender address is required')
    }

    const appClient = await getAppDetails(sender)
    const result = await appClient.send.getClickCount({
      args: { user: sender },
    })
    return Number(result.return)
  }

  // Record a click on the blockchain
  const recordClickOnChain = async (sender: string | null) => {
    if (!sender) {
      throw new Error('Sender address is required')
    }

    const appClient = await getAppDetails(sender)
    await appClient.send.recordClick({
      args: [],
    })
  }

  // Opt in to the smart contract
  const optInToApp = async (sender: string | null) => {
    if (!sender) {
      throw new Error('Sender address is required')
    }

    try {
      setIsOptingIn(true)
      setOptInStatus('pending')
      const appClient = await getAppDetails(sender)
      await appClient.send.optIn.optIn({
        args: [],
        suppressLog: false,
      })
      console.log('Successfully opted in to app')
      setOptInStatus('success')
      setIsOptedIn(true)
      // Wait a moment to show success message, then start game
      startWeb3Game()
    } catch (error) {
      console.error('Error opting in:', error)
      setOptInStatus('error')
    } finally {
      setIsOptingIn(false)
    }
  }

  useEffect(() => {
    let moveTimeout: NodeJS.Timeout

    if (gameStarted && hearts > 0) {
      // Move logo every 1 second if not clicked
      moveTimeout = setTimeout(randomizePosition, 1000)
    }

    return () => clearTimeout(moveTimeout)
  }, [objectPosition, gameStarted, hearts])

  useEffect(() => {
    // Check opt-in status when wallet is connected
    if (activeAddress) {
      checkOptIn(activeAddress)
    }
  }, [activeAddress])

  // Detect game end
  useEffect(() => {
    if (gameStarted && hearts <= 0 && isWeb3Mode) {
      // Commenting out on-chain click count fetch
      // fetchOnChainClickCount(activeAddress)
      //   .then((count) => setOnChainClickCount(count))
      //   .catch(console.error)
    }
  }, [gameStarted, hearts, isWeb3Mode, activeAddress])

  // Load leaderboard data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('clickrLeaderboard')
    if (savedData) {
      setLeaderboardData(JSON.parse(savedData))
    }
  }, [])

  // Update leaderboard when game ends
  useEffect(() => {
    if (gameStarted && hearts <= 0 && activeAddress && score > 0) {
      const newEntry: LeaderboardEntry = {
        address: activeAddress,
        score: score,
        timestamp: Date.now(),
      }

      const updatedLeaderboard = [...leaderboardData, newEntry]
        .sort((a, b) => b.score - a.score) // Sort by score descending
        .slice(0, 5) // Keep only top 5

      setLeaderboardData(updatedLeaderboard)
      localStorage.setItem('clickrLeaderboard', JSON.stringify(updatedLeaderboard))
    }
  }, [gameStarted, hearts, activeAddress, score, leaderboardData])

  const randomizePosition = () => {
    const logoSize = 5
    const newTop = Math.random() * 80
    const newLeft = Math.random() * 80

    const newPoint: PathPoint = {
      id: Date.now(),
      x: newLeft + logoSize / 2,
      y: newTop + logoSize / 2,
      opacity: 1,
    }

    setPath((prev) => [...prev.slice(-4), newPoint])
    setObjectPosition({ top: `${newTop}%`, left: `${newLeft}%` })

    // Smooth fade-out
    setTimeout(() => {
      setPath((prev) => prev.map((p) => (p.id === newPoint.id ? { ...p, opacity: 0 } : p)))
    }, 2000)
  }

  // Handle click on the game area
  const handleClick = (e: React.MouseEvent) => {
    // Don't process clicks if game isn't started or is over
    if (!gameStarted || hearts <= 0) return

    // Check if click is on a navigation element
    const target = e.target as HTMLElement
    if (target.closest('nav') || target.closest('a') || target.closest('button')) {
      return
    }

    // Check if click is on the Algorand logo
    if (target.id === 'click-target') {
      // Clicked the object
      setScore((prev) => prev + 1)
      setAnimateClick(true)
      setTimeout(() => setAnimateClick(false), 200)
      randomizePosition()
    } else {
      // Missed the object
      setMissedClick(true)
      setHearts((prev) => Math.max(0, prev - 1))
      setTimeout(() => setMissedClick(false), 200)
    }
  }

  // Start countdown and then game
  const startGame = () => {
    // Reset game state
    setScore(0)
    setHearts(isWeb3Mode ? 5 : 3) // 5 hearts for Web3 mode, 3 for Web2 mode
    setGameStarted(false)
    setPath([])

    // Reset transaction state
    setIsProcessingTxn(false)
    setTxnStatus('idle')

    // Start countdown
    setCountdown(3)
    let count = 3
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null))

      if (count <= 1) {
        clearInterval(countdownInterval)
        setCountdown(null)
        setGameStarted(true)
        randomizePosition()
      }
      count--
    }, 1000)
  }

  // Start Web2 mode
  const selectWeb2Mode = () => {
    setIsWeb3Mode(false)
    startGame()
  }

  // Start Web3 mode (with opt-in check)
  const selectWeb3Mode = async () => {
    if (!activeAddress) return

    setTxnStatus('idle')

    // Refresh opt-in status
    const optedIn = await checkOptIn(activeAddress)

    if (optedIn) {
      // Already opted in, start game immediately
      startWeb3Game()
    } else {
      // Need to opt in first
      setGameStarted(false)
      setIsWeb3Mode(true)
      // The opt-in UI will be shown, user must opt in before playing
    }
  }

  // Start Web3 game after opt-in
  const startWeb3Game = () => {
    setIsWeb3Mode(true)
    startGame()
  }

  // Handle game restart
  const handleRestart = () => {
    if (isWeb3Mode) {
      startWeb3Game()
    } else {
      selectWeb2Mode()
    }
  }

  // Handle payment transaction to the smart contract
  const handleTransaction = async () => {
    if (!activeAddress) {
      console.error('No active account')
      return
    }

    try {
      setIsProcessingTxn(true)
      setTxnStatus('pending')

      // Get app details and create client
      const appClient = await getAppDetails(activeAddress)
      if (!appClient) {
        throw new Error('Failed to get app details')
      }

      const paymentAmount = REWARD_MULTIPLIER * score
      console.log('Creating payment with:', {
        sender: activeAddress,
        appAddress: appClient.appAddress,
        amount: paymentAmount,
      })

      // Create a unique note for each transaction to ensure it's not reused
      const uniqueNote = new TextEncoder().encode(`Payment for ${score} clicks}`)

      // Send payment using AlgoKit's payment utility
      const result = await algorand.send.payment({
        sender: activeAddress,
        receiver: appClient.appAddress,
        amount: algokit.algos(paymentAmount),
        note: uniqueNote,
        maxRoundsToWaitForConfirmation: 4,
        suppressLog: false, // Show transaction details
      })

      console.log('Payment sent with txIds:', result.txIds[0])
      setTxnStatus('success')
    } catch (error) {
      console.error('Transaction error:', error)
      setTxnStatus('error')
    } finally {
      setIsProcessingTxn(false)
    }
  }

  // Update score display in navigation
  useEffect(() => {
    const scoreElement = document.getElementById('game-score')
    if (scoreElement) {
      scoreElement.textContent = score.toString()
    }
  }, [score])

  // Update hearts display in navigation
  useEffect(() => {
    const heartsContainer = document.getElementById('hearts-container')
    if (heartsContainer) {
      heartsContainer.innerHTML = Array.from({ length: hearts }, (_, i) => `<span class="text-red-500 text-xl">❤️</span>`).join('')
    }
  }, [hearts])

  // Update Web3 mode indicator
  useEffect(() => {
    const web3Indicator = document.getElementById('web3-mode-indicator')
    if (web3Indicator) {
      web3Indicator.style.display = isWeb3Mode ? 'inline' : 'none'
    }
  }, [isWeb3Mode])

  // Setup leaderboard button listener
  useEffect(() => {
    const leaderboardButton = document.getElementById('leaderboard-button')
    if (leaderboardButton) {
      leaderboardButton.addEventListener('click', () => setShowLeaderboard(true))
    }
    return () => {
      if (leaderboardButton) {
        leaderboardButton.removeEventListener('click', () => setShowLeaderboard(true))
      }
    }
  }, [])

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center bg-black text-white relative transition-all ${
        missedClick ? 'bg-red-700' : ''
      }`}
      onClick={handleClick}
    >
      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg border border-cyber-pink shadow-neon max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold neon-text">Top 5 Players</h2>
              <button onClick={() => setShowLeaderboard(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => {
                const entry = leaderboardData[index]
                return (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}</span>
                      {entry ? (
                        <span className="font-bold text-sm">
                          {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                        </span>
                      ) : (
                        <span className="font-bold text-sm text-gray-500 italic">Waiting for players...</span>
                      )}
                    </div>
                    {entry ? <span className="text-lg">{entry.score} clicks</span> : <span className="text-lg text-gray-500">-</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Countdown Before Start */}
      {countdown !== null && (
        <div className="text-6xl font-bold neon-text absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          {countdown}
        </div>
      )}

      {/* Main Menu */}
      {!gameStarted && countdown === null && !isWeb3Mode && (
        <div className="text-center p-8 bg-gray-900 bg-opacity-80 rounded-lg backdrop-blur-md border border-cyber-pink shadow-neon">
          <h1 className="text-4xl font-bold neon-text mb-8">Clickr Game</h1>

          {!activeAddress ? (
            <div>
              <p className="mt-4 text-xl mb-6">Connect your wallet to play Web3 Mode and earn rewards!</p>
              <button className="btn neon-btn w-64" onClick={selectWeb2Mode}>
                Play Web2 Mode
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <button className="btn neon-btn w-64" onClick={selectWeb2Mode}>
                Play Web2 Mode (Casual)
              </button>
              <button className="btn neon-btn w-64" onClick={selectWeb3Mode} disabled={isCheckingOptIn}>
                {isCheckingOptIn ? 'Checking...' : 'Play Web3 Mode (High Stakes)'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Opt-in Screen for Web3 Mode */}
      {!gameStarted && countdown === null && isWeb3Mode && !isOptedIn && (
        <div className="text-center p-8 bg-gray-900 bg-opacity-80 rounded-lg backdrop-blur-md border border-cyber-pink shadow-neon">
          <h1 className="text-3xl font-bold neon-text mb-4">Web3 Mode Setup</h1>
          <p className="mt-4 mb-6">You need to opt into the Clickr app before playing in Web3 Mode.</p>

          <div className="mt-4">
            <button className="btn neon-btn w-full" onClick={() => optInToApp(activeAddress)} disabled={isOptingIn}>
              {isOptingIn ? 'Opting in...' : 'Opt in to Play'}
            </button>
            {optInStatus === 'success' && (
              <div className="mt-6 text-green-400">
                <p className="text-lg font-bold">Successfully opted in! 🎉</p>
                <p className="text-sm mt-2">Starting game in a moment...</p>
              </div>
            )}
            {optInStatus === 'error' && <p className="text-red-400 text-sm mt-2">Failed to opt in. Please try again.</p>}
          </div>

          <button
            className="btn text-gray-400 mt-6"
            onClick={() => {
              setIsWeb3Mode(false)
              setTxnStatus('idle')
              setOptInStatus('idle')
            }}
          >
            Go Back
          </button>
        </div>
      )}

      {/* Game Object */}
      {gameStarted && hearts > 0 && (
        <img
          src={algorandLogo}
          id="click-target"
          alt="Click Me"
          className={`absolute w-20 md:w-24 cursor-pointer transition-all transform ${animateClick ? 'scale-125' : ''}`}
          style={{ top: objectPosition.top, left: objectPosition.left }}
        />
      )}

      {/* Game Over */}
      {gameStarted && hearts <= 0 && (
        <div className="text-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-8 bg-gray-900 bg-opacity-80 rounded-lg backdrop-blur-md border border-cyber-pink shadow-neon">
          <h1 className="text-3xl font-bold neon-text mb-4">Game Over</h1>
          <p className="mt-2 text-xl">Final Score: {score}</p>

          {isWeb3Mode && (
            <div className="mt-6">
              <p className="text-lg font-bold">
                Send Amount to Reward Pool: <span className="text-green-400">{getRewardAmount().toFixed(3)} ALGO</span>
              </p>

              {txnStatus === 'success' && (
                <div className="mt-6 text-green-400">
                  <p>Transaction successful! Reward sent to pool.</p>
                  <button className="btn neon-btn mt-4" onClick={handleRestart}>
                    Play New Game
                  </button>
                </div>
              )}

              {txnStatus === 'error' && (
                <div className="mt-6 text-red-400">
                  <p>Transaction failed. Please try again.</p>
                  <button className="btn neon-btn mt-4" onClick={handleTransaction} disabled={isProcessingTxn}>
                    Retry Transaction
                  </button>
                </div>
              )}

              {txnStatus === 'idle' && (
                <button className="btn neon-btn mt-6 w-full" onClick={handleTransaction} disabled={isProcessingTxn}>
                  Sign & Send to Reward Pool
                </button>
              )}

              {txnStatus === 'pending' && (
                <div className="mt-6 text-yellow-300">
                  <p>Processing your transaction...</p>
                </div>
              )}
            </div>
          )}

          {!isWeb3Mode && (
            <button className="btn neon-btn mt-6" onClick={handleRestart}>
              Play New Game
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default ClickrGame
