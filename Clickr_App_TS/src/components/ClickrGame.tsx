import React, { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet'
import { Button, Container, Typography, Box, CircularProgress } from '@mui/material'

const API_BASE_URL = 'http://localhost:3000'

const ClickrGame: React.FC = () => {
  const { activeAddress, signTransactions } = useWallet()
  const [isOptedIn, setIsOptedIn] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check opt-in status when wallet is connected
  useEffect(() => {
    if (activeAddress) {
      checkOptInStatus()
    }
  }, [activeAddress])

  const checkOptInStatus = async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log('Checking opt-in status for:', activeAddress)
      const response = await fetch(`${API_BASE_URL}/api/check-opt-in?address=${activeAddress}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      console.log('Opt-in status:', data.isOptedIn)
      setIsOptedIn(data.isOptedIn)
    } catch (err) {
      console.error('Error checking opt-in:', err)
      setError(err instanceof Error ? err.message : 'Failed to check opt-in status')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOptIn = async () => {
    if (!activeAddress || !signTransactions) {
      setError('Wallet not connected')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      console.log('Creating opt-in transaction for:', activeAddress)

      // Get the opt-in transaction
      const response = await fetch(`${API_BASE_URL}/api/opt-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: activeAddress }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }
      const { unsignedTxn } = await response.json()

      // Sign the transaction
      console.log('Signing transaction...')
      const signedTxns = await signTransactions([Buffer.from(unsignedTxn, 'base64')])
      const signedTxn = Buffer.from(signedTxns[0]).toString('base64')

      // Submit the transaction
      console.log('Submitting transaction...')
      const submitResponse = await fetch(`${API_BASE_URL}/api/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signedTxn }),
      })
      if (!submitResponse.ok) {
        const errorData = await submitResponse.json()
        throw new Error(errorData.error || `HTTP error! status: ${submitResponse.status}`)
      }
      const result = await submitResponse.json()
      console.log('Transaction submitted:', result)

      // Check opt-in status again
      await checkOptInStatus()
    } catch (err) {
      console.error('Error opting in:', err)
      setError(err instanceof Error ? err.message : 'Failed to opt in to the app')
    } finally {
      setIsLoading(false)
    }
  }

  if (!activeAddress) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Connect your wallet to play
          </Typography>
        </Box>
      </Container>
    )
  }

  if (isLoading) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography color="error" gutterBottom>
            {error}
          </Typography>
          <Button variant="contained" onClick={checkOptInStatus}>
            Try Again
          </Button>
        </Box>
      </Container>
    )
  }

  if (!isOptedIn) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Opt in to play the game
          </Typography>
          <Button variant="contained" onClick={handleOptIn}>
            Opt In
          </Button>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Game Ready!
        </Typography>
        <Button variant="contained" color="primary">
          Play Game
        </Button>
      </Box>
    </Container>
  )
}

export default ClickrGame
