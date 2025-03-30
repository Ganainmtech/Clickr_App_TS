import { AlgorandClient, microAlgo } from '@algorandfoundation/algokit-utils'
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount'
import { ClickrLogicClient } from '../artifacts/clickr_logic/clickrLogicClient'


async function cronJob() {
  // 1. Initialize Algorand client from environment or specific network
  const algorand = AlgorandClient.fromEnvironment()

  // Get account from KMD
  const cronAccount = await algorand.account.fromKmd('lora-dev')

  console.log(`Using cron account: ${cronAccount.addr}`)

  // Get app client for an existing app
  const appClient = algorand.client.getTypedAppClientById(ClickrLogicClient, {
    appId: 1019n,
  })


  // 4. Get the LocalNet dispenser account
  const dispenserAccount = await algorand.account.localNetDispenser()
  console.log(`\nUsing LocalNet dispenser account: ${dispenserAccount.addr.toString()}`)

  //async function optInCronAccountToApp() {
    // Opt-in the cron account to the app using appClient.send.optIn.optIn()
  //  await appClient.send.optIn.optIn({
    //  sender: cronAccount.addr, // The cron account that needs to opt-in
    //  signer: cronAccount.signer, // Optional, signer for the cron account
    //  args: [], // Any required arguments for the optIn (empty if none)
    //})
  //}

    //console.log(`Cron account ${cronAccount.addr} has successfully opted-in!`)

   //Call opt-in function before further operations
  //await optInCronAccountToApp()

  // 6. Fund the smart contract account with 5 Algos from the dispenser
  await algorand.send.payment({
    sender: dispenserAccount,
    receiver: 'E36TMDCHVSYAAI5HHNPGGHYFUJYK4MW2SKRORFZQBB46ITJYQ7L72GBWUU',
    amount: AlgoAmount.Algos(3),
    note: 'Funding app account',
  })
  console.log(`\nFunded app account with 5 Algos`)

  // 7. Get accounts that have opted into the application
  async function getAccountsWithLocalState(appID: bigint) {
    try {
      // Use the indexer to search for accounts that have opted into this app
      const response = await algorand.client.indexer
        .searchAccounts()
        .applicationID(appID) // Filter by application ID
        .do()

      // Extract the account addresses
      const accounts = response.accounts.map((account) => account.address)
      console.log(`\nFound ${accounts.length} accounts with local state for app ${appID}`)
      return accounts
    } catch (error) {
      console.error('Error getting accounts with local state:', error)
      return []
    }
  }

  // 8. Then in your main function:
  const users = await getAccountsWithLocalState(1019n)
  console.log(`\nFound ${users.length} users who have opted into the app`)

  // 9. For each user, retrieve their local state from the app
  for (const user of users) {
    console.log(`\nProcessing local state for user: ${user}`)

    const userLocalState = await algorand.app.getLocalState(1019n, user)

    // 10. Process each user's local state
    if (userLocalState) {
      // Local state is returned as a decoded object with various representations of the value
      const clickCountValue = userLocalState['l']

      let clickCount = 0
      if (clickCountValue) {
        if (typeof clickCountValue.value === 'bigint' || typeof clickCountValue.value === 'number') {
          clickCount = Number(clickCountValue.value)
        }
      }

      // 11. Check if there are pending actions to be processed
      if (clickCount > 0) {
        console.log(`\nUser ${user} has ${clickCount} clicks to process`)

        for (let i = 0; i < clickCount; i++) {
          // 12. Send a transaction for each click
          await algorand.send.payment({
            sender: cronAccount,
            receiver: cronAccount, // Send to itself
            amount: AlgoAmount.MicroAlgos(0), // Zero amount to simulate action
            note: `Triggered by app 1019n - Click ${i + 1} for User ${user}`, // Unique note
          })
        }

        // 13. Mark the action as processed by updating the smart contract
        await appClient.send.clickProcessed({
          sender: cronAccount,
          args: {
            user: user,
          },
        })

        console.log(`\nProcessed click for user ${user}`)
      }
    }
  }

  // 14. Timing check for the `distributeRewards` method (5-minute window)
  console.log(`\nCalling distributeRewards...`)

  // Call the distributeRewards method
  const rewardTxnResult = await appClient.send.distributeRewards({
    sender: cronAccount.addr,
    signer: cronAccount.signer,
    args: {},
    coverAppCallInnerTransactionFees: true,
    maxFee: AlgoAmount.MicroAlgos(10000),
  })

  // The result should contain the transaction details
  const signedTxn = rewardTxnResult.transaction
  console.log(`Transaction confirmed: ${signedTxn.txID}`)

  console.log(`\nReward distribution complete!`)
}


// Execute the cron job
cronJob().catch(console.error)
