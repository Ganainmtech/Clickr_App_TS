import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { Transaction } from 'algosdk'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

//const algodConfig = getAlgodConfigFromViteEnvironment()
const algorand = AlgorandClient.fromEnvironment()
//const algorand = new AlgorandClient(algodConfig)

// Replace with your actual cron account address and mnemonic
const CRON_ACCOUNT_ADDRESS = 'YOUR_CRON_ACCOUNT_ADDRESS'
const CRON_ACCOUNT_MNEMONIC = 'YOUR_CRON_ACCOUNT_MNEMONIC'

async function sendZeroAmountTransaction() {
  try {
    const suggestedParams = await algorand.client.getTransactionParams().do()

    const txn = new Transaction({
      from: CRON_ACCOUNT_ADDRESS,
      to: CRON_ACCOUNT_ADDRESS,
      amount: 0,
      ...suggestedParams,
    })

    const signedTxn = txn.signTxn(algorand.mnemonicToSecretKey(CRON_ACCOUNT_MNEMONIC).sk)
    await algorand.client.sendRawTransaction(signedTxn).do()

    console.log('Sent zero-amount transaction')
  } catch (error) {
    console.error('Error sending transaction:', error)
  }
}

// Send a transaction every 5 seconds
setInterval(sendZeroAmountTransaction, 5000)

// Also send one immediately
sendZeroAmountTransaction()
