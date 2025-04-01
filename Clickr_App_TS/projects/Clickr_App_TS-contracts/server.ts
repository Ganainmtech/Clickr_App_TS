import express from 'express'
import cors from 'cors'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { ClickrLogicClient } from './smart_contracts/artifacts/clickr_logic/clickrLogicClient'

const app = express()
const PORT = 3000

// Initialize Algorand client
const algorand = AlgorandClient.fromEnvironment()
const appId = 1002n
const appClient = algorand.client.getTypedAppClientById(ClickrLogicClient, { appId })

// Middleware
app.use(cors())
app.use(express.json())

// Custom JSON replacer for BigInt
const bigIntReplacer = (key: string, value: any) => {
  if (typeof value === 'bigint') {
    return value.toString()
  }
  return value
}

// API route to check if account is opted in
app.get('/api/check-opt-in', async (req, res) => {
  const { address } = req.query

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Address is required' })
  }

  try {
    console.log('Checking opt-in status for address:', address)

    // Get account information
    const accountInfo = await algorand.client.algod.accountInformation(address).do()

    // Check if account is opted into the app
    const isOptedIn = accountInfo.appsLocalState?.some(
      (app) => BigInt(app.id) === appId
    ) || false

    return res.json({ isOptedIn })
  } catch (error) {
    console.error('Error checking opt-in status:', error)
    return res.status(500).json({ error: 'Failed to check opt-in status' })
  }
})

// API route to create opt-in transaction
app.post('/api/opt-in', async (req, res) => {
  const { address } = req.body

  if (!address) {
    return res.status(400).json({ error: 'Address is required' })
  }

  try {
    console.log('Creating opt-in transaction for address:', address)

    // Create the opt-in transaction using the app client
    const optInTxn = await appClient.send.optIn.optIn({
      sender: address,
      args: [],
    })

    return res.json({
      unsignedTxn: optInTxn.transaction.txID(),
    })
  } catch (error) {
    console.error('Error creating opt-in transaction:', error)
    return res.status(500).json({ error: 'Failed to create opt-in transaction' })
  }
})

// API route to create click transaction
app.post('/api/click', async (req, res) => {
  const { address } = req.body

  if (!address) {
    return res.status(400).json({ error: 'Address is required' })
  }

  try {
    console.log('Creating click transaction for address:', address)

    // Create the click transaction using the app client
    const clickTxn = await appClient.send.recordClick({
      sender: address,
      args: [],
    })

    return res.json({
      unsignedTxn: clickTxn.transaction.txID(),
    })
  } catch (error) {
    console.error('Error creating click transaction:', error)
    return res.status(500).json({ error: 'Failed to create click transaction' })
  }
})

// API route to submit transaction
app.post('/api/submit', async (req, res) => {
  const { signedTxn } = req.body

  if (!signedTxn) {
    return res.status(400).json({ error: 'Signed transaction is required' })
  }

  try {
    console.log('Submitting transaction')

    // Submit the transaction
    const result = await algorand.client.algod.sendRawTransaction(Buffer.from(signedTxn, 'base64')).do()

    // Wait for confirmation
    const confirmedTxn = await algorand.client.algod.waitForConfirmation(result.txId).do()

    return res.json({
      txId: result.txId,
      confirmedRound: confirmedTxn.confirmedRound,
    })
  } catch (error) {
    console.error('Error submitting transaction:', error)
    return res.status(500).json({ error: 'Failed to submit transaction' })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Connected to app ID: ${appId}`)
})
