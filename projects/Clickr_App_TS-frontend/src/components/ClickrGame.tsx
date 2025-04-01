import * as algokit from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import algosdk, { Transaction } from 'algosdk'
import { useEffect, useState } from 'react'
import algorandLogo from '../assets/algorand-logo-white.png'
import { ClickrLogicClient } from '../contracts/clickrLogic'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

// Smart contract configuration
const APP_ID = 1002n
const REWARD_MULTIPLIER = 0.006 // Cost per click in ALGO

interface PathPoint {
  id: number
  x: number
  y: number
  opacity: number
}

export function ClickrGame() {
  const { activeAddress, signTransactions, activeAccount } = useWallet()
  const [score, setScore] = useState(0)
  const [hearts, setHearts] = useState(5)
  const [objectPosition, setObjectPosition] = useState({ top: '50%', left: '50%' })
  const [gameStarted, setGameStarted] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [animateClick, setAnimateClick] = useState(false)
  const [missedClick, setMissedClick] = useState(false)
  const [path, setPath] = useState<PathPoint[]>([])

  const [isWeb3Mode, setIsWeb3Mode] = useState(false)
  const [isProcessingTxn, setIsProcessingTxn] = useState(false)
  const [txnStatus, setTxnStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const [isOptedIn, setIsOptedIn] = useState(false)
  const [isCheckingOptIn, setIsCheckingOptIn] = useState(false)
  const [isOptingIn, setIsOptingIn] = useState(false)
  const [onChainClickCount, setOnChainClickCount] = useState<number | null>(null)

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

    const appClient = await getAppDetails(sender)
    await appClient.send.optIn.optIn({
      args: [],
      suppressLog: false,
    })
    console.log('Successfully opted in to app')
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
      // Only fetch the click count, don't trigger transaction
      fetchOnChainClickCount(activeAddress)
        .then((count) => setOnChainClickCount(count))
        .catch(console.error)
    }
  }, [gameStarted, hearts, isWeb3Mode, activeAddress])

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

  // Handle user click
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gameStarted || countdown !== null) return

    if ((e.target as HTMLElement).id === 'click-target') {
      setScore(score + 1)
      setAnimateClick(true)
      setTimeout(() => setAnimateClick(false), 200)
      randomizePosition()
    } else {
      if (hearts > 0) {
        setHearts((prev) => Math.max(0, prev - 1))
      }
      setMissedClick(true)
      setTimeout(() => setMissedClick(false), 200)
    }
  }

  // Start countdown and then game
  const startGame = () => {
    setScore(0)
    setHearts(5)
    setGameStarted(false)
    setCountdown(3)
    setTxnStatus('idle')
    setOnChainClickCount(null)

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

      // Send payment using AlgoKit's payment utility
      const result = await algorand.send.payment({
        sender: activeAddress,
        receiver: appClient.appAddress,
        amount: algokit.algos(paymentAmount),
        note: new TextEncoder().encode(`Payment for ${score} clicks`),
        maxRoundsToWaitForConfirmation: 4,
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

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center bg-black text-white relative transition-all ${
        missedClick ? 'bg-red-700' : ''
      }`}
      onClick={handleClick}
    >
      {/* Top Right Menu */}
      <div className="absolute top-4 right-4 flex items-center space-x-6 px-6 py-3 bg-opacity-40 backdrop-blur-lg bg-gray-800 rounded-full shadow-neon border border-cyber-pink">
        <span className="text-lg font-bold">🏆 {score}</span>
        <div className="flex items-center space-x-1">
          {Array.from({ length: hearts }, (_, i) => (
            <span key={i} className="text-red-500 text-xl">
              ❤️
            </span>
          ))}
        </div>
        {isWeb3Mode && (
          <span className="text-sm font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">Web3 Mode</span>
        )}
      </div>

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

          {txnStatus === 'idle' && (
            <button className="btn btn-primary" onClick={() => optInToApp(activeAddress)} disabled={isOptingIn || !activeAddress}>
              {isOptingIn ? 'Opting in...' : 'Opt in to App'}
            </button>
          )}

          {txnStatus === 'pending' && (
            <div className="text-yellow-300 my-4">
              <p>Processing opt-in transaction...</p>
            </div>
          )}

          {txnStatus === 'error' && (
            <div className="text-red-400 my-4">
              <p>Opt-in transaction failed. Please try again.</p>
              <button className="btn neon-btn mt-4" onClick={() => optInToApp(activeAddress)} disabled={isOptingIn || !activeAddress}>
                Retry Opt-in
              </button>
            </div>
          )}

          <button
            className="btn text-gray-400 mt-6"
            onClick={() => {
              setIsWeb3Mode(false)
              setTxnStatus('idle')
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

              {onChainClickCount !== null && (
                <p className="text-sm mt-2">
                  On-chain Clicks Recorded: <span className="text-blue-400">{onChainClickCount}</span>
                </p>
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

              {txnStatus === 'success' && (
                <div className="mt-6 text-green-400">
                  <p>Transaction successful! Reward sent to pool.</p>
                </div>
              )}

              {txnStatus === 'error' && (
                <div className="mt-6 text-red-400">
                  <p>Transaction failed. Please try again.</p>
                  <button className="btn neon-btn mt-4" onClick={handleTransaction} disabled={isProcessingTxn}>
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          <button className={`btn neon-btn ${isWeb3Mode ? 'mt-6' : 'mt-8'} w-full`} onClick={startGame}>
            Play Again
          </button>
        </div>
      )}
    </div>
  )
}

export default ClickrGame
