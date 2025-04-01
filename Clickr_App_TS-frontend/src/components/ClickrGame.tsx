import { useWallet } from '@txnlab/use-wallet'
import { useEffect, useState } from 'react'
import algorandLogo from '../assets/algorand-logo-white.png'

// Smart contract configuration
const APP_ID = '1002' // Updated to correct app ID
const REWARD_MULTIPLIER = 0.006 // Cost per click in ALGO

interface PathPoint {
  id: number
  x: number
  y: number
  opacity: number
}

type App = {
  id: number
}

const ClickrGame = () => {
  const { activeAddress, signTransactions } = useWallet()
  const [score, setScore] = useState(0)
  const [hearts, setHearts] = useState(3)
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

  // Calculate reward amount based on score
  const getRewardAmount = () => {
    return score * REWARD_MULTIPLIER
  }

  // Add a base API URL
  const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : ''

  // Check if the user is opted into the app
  const checkOptIn = async () => {
    if (!activeAddress) return false

    setIsCheckingOptIn(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/check-opt-in?address=${activeAddress}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Opt-in check error response:', errorText)
        throw new Error(`Failed to check opt-in status: ${response.status}`)
      }

      const data = await response.json()
      setIsOptedIn(data.isOptedIn)
      return data.isOptedIn
    } catch (error) {
      console.error('Error checking opt-in status:', error)
      setTxnStatus('error')
      return false
    } finally {
      setIsCheckingOptIn(false)
    }
  }

  // Opt into the app
  const optInToApp = async () => {
    if (!activeAddress) return

    setIsOptingIn(true)
    setTxnStatus('pending')

    try {
      // Request opt-in transaction from API
      const response = await fetch(`${API_BASE_URL}/api/opt-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: activeAddress,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Opt-in error response:', errorText)
        throw new Error(`Failed to create opt-in transaction: ${response.status}`)
      }

      const { unsignedTxn } = await response.json()

      // Sign the transaction
      const signedTxns = await signTransactions([Buffer.from(unsignedTxn, 'base64')])
      const signedTxn = Buffer.from(signedTxns[0]).toString('base64')

      // Submit the transaction
      const submitResponse = await fetch(`${API_BASE_URL}/api/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signedTxn }),
      })

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text()
        console.error('Submit error response:', errorText)
        throw new Error(`Failed to submit transaction: ${submitResponse.status}`)
      }

      const result = await submitResponse.json()
      console.log('Transaction submitted:', result)

      // Check opt-in status again
      await checkOptIn()
      setTxnStatus('success')
    } catch (error) {
      console.error('Opt-in error:', error)
      setTxnStatus('error')
    } finally {
      setIsOptingIn(false)
    }
  }

  // Record a click
  const recordClick = async () => {
    if (!activeAddress || !isOptedIn) return

    setIsProcessingTxn(true)
    setTxnStatus('pending')

    try {
      // Request click transaction from API
      const response = await fetch(`${API_BASE_URL}/api/click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: activeAddress,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Click error response:', errorText)
        throw new Error(`Failed to create click transaction: ${response.status}`)
      }

      const { unsignedTxn } = await response.json()

      // Sign the transaction
      const signedTxns = await signTransactions([Buffer.from(unsignedTxn, 'base64')])
      const signedTxn = Buffer.from(signedTxns[0]).toString('base64')

      // Submit the transaction
      const submitResponse = await fetch(`${API_BASE_URL}/api/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signedTxn }),
      })

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text()
        console.error('Submit error response:', errorText)
        throw new Error(`Failed to submit transaction: ${submitResponse.status}`)
      }

      const result = await submitResponse.json()
      console.log('Click transaction submitted:', result)

      // Update local state
      setScore(prev => prev + 1)
      setTxnStatus('success')
    } catch (error) {
      console.error('Click error:', error)
      setTxnStatus('error')
    } finally {
      setIsProcessingTxn(false)
    }
  }

  // ... rest of the component code ...
}
