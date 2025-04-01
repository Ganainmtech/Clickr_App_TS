import { AlgorandClient, microAlgos, waitForConfirmation } from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'
import bodyParser from 'body-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { ClickrLogicClient } from './smart_contracts/artifacts/clickrLogic/clickrLogicClient'

dotenv.config()

const app = express()

// Configure CORS to allow requests from your frontend
app.use(
  cors({
    origin: 'http://localhost:5173', // Vite's default port
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  }),
)

app.use(bodyParser.json())

// Define appId - this needs to be set to your deployed app ID
const appId = 1002n // Replace with your actual deployed app ID or load from environment
const CONTRACT_ADDRESS = 'O3VYQKJ45XILV2GVDO44LM2IGPUD2QYRXNFX5K4ZDC2B4BD4ZZXU5AQG24'
const REWARD_MULTIPLIER = 0.006 // Cost per click in ALGO

// Create Algorand client from environment
const algorand = AlgorandClient.fromEnvironment()
const appClient = algorand.client.getTypedAppClientById(ClickrLogicClient, { appId })

// API route to get account information
app.get('/api/account-info', async (req, res) => {
  const { address } = req.query

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Address is required' })
  }

  try {
    const accountInfo = await algorand.client.algod.accountInformation(address).do()
    return res.json({ account: accountInfo })
  } catch (error) {
    console.error('Error fetching account info:', error)
    return res.status(500).json({ error: 'Failed to fetch account information' })
  }
})

// API route to create opt-in transaction
app.post('/api/opt-in-transaction', async (req, res) => {
  const { address } = req.body

  if (!address) {
    return res.status(400).json({ error: 'Address is required' })
  }

  try {
    // Create application opt-in transaction
    const suggestedParams = await algorand.client.algod.getTransactionParams().do()

    // Prepare the transaction using the client
    const optInTxn = await appClient.send.optIn.optIn({
      sender: address,
      args: [],
    })

    // Get the raw transaction to return to the client
    const encodedTxn = Buffer.from(optInTxn.transaction.toByte()).toString('base64')

    return res.json({
      unsignedTxn: encodedTxn,
    })
  } catch (error) {
    console.error('Error creating opt-in transaction:', error)
    return res.status(500).json({ error: 'Failed to create opt-in transaction' })
  }
})

// API route to create payment transaction
app.post('/api/payment-transaction', async (req, res) => {
  const { senderAddress, receiverAddress, amount } = req.body

  if (!senderAddress || !receiverAddress || amount === undefined) {
    return res.status(400).json({ error: 'Sender address, receiver address, and amount are required' })
  }

  try {
    // Create payment transaction using AlgoKit
    const paymentTxn = await algorand.createTransaction.payment({
      sender: senderAddress,
      receiver: receiverAddress,
      amount: microAlgos(amount),
    })

    // Get the underlying transaction object
    const txn = paymentTxn

    // Encode the unsigned transaction - this step still requires algosdk
    const encodedTxn = Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64')

    return res.json({
      unsignedTxn: encodedTxn,
    })
  } catch (error) {
    console.error('Error creating payment transaction:', error)
    return res.status(500).json({ error: 'Failed to create payment transaction' })
  }
})

// API route to submit a signed transaction
app.post('/api/submit-transaction', async (req, res) => {
  const { signedTxn } = req.body

  if (!signedTxn) {
    return res.status(400).json({ error: 'Signed transaction is required' })
  }

  try {
    // Decode the signed transaction
    const decodedSignedTxn = Buffer.from(signedTxn, 'base64')

    // Submit the transaction
    const txnResponse = await algorand.client.algod.sendRawTransaction(decodedSignedTxn).do()

    // Wait for confirmation (4 rounds should be sufficient)
    const confirmedTxn = await waitForConfirmation(txnResponse.txid, 4, algorand.client.algod)

    return res.json({
      txId: txnResponse.txid,
      confirmedRound: confirmedTxn.confirmedRound,
    })
  } catch (error) {
    console.error('Error submitting transaction:', error)
    return res.status(500).json({ error: 'Failed to submit transaction' })
  }
})

// Add a new route to handle click actions
app.post('/api/click', async (req, res) => {
  const { address } = req.body

  if (!address) {
    return res.status(400).json({ error: 'Address is required' })
  }

  try {
    // Prepare the click transaction using the correct method name
    const clickTxn = await appClient.send.recordClick({
      sender: address,
      args: [],
    })

    const encodedTxn = Buffer.from(clickTxn.transaction.toByte()).toString('base64')

    return res.json({
      unsignedTxn: encodedTxn,
    })
  } catch (error) {
    console.error('Error creating click transaction:', error)
    return res.status(500).json({ error: 'Failed to create click transaction' })
  }
})

// API route to get user's click count
app.get('/api/click-count', async (req, res) => {
  const { address } = req.query

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Address is required' })
  }

  try {
    const localState = await algorand.app.getLocalState(appId, address)
    const clickCount = localState?.['l'] ? Number(localState['l'].value) : 0

    return res.json({ clickCount })
  } catch (error) {
    console.error('Error fetching click count:', error)
    return res.status(500).json({ error: 'Failed to fetch click count' })
  }
})

// Start the server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Connected to app ID: ${appId}`)
})
