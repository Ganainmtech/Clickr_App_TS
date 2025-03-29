import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount'

// Run this script on a schedule
async function cronJob() {
  // 1. Initialize Algorand client from environment or specific network
  const algorand = AlgorandClient.fromEnvironment()

  // 2. Generate a random cron account
  const cronAccount = await algorand.account.random()
  console.log(`\nGenerated new cron account: ${cronAccount.addr.toString()}`)

  // 3. Get the LocalNet dispenser account
  const dispenserAccount = await algorand.account.localNetDispenser()
  console.log(`\nUsing LocalNet dispenser account: ${dispenserAccount.addr.toString()}`)

  // 4. Fund the cron account with 5 Algos from the dispenser (for now, this will be paid by clicker via SC itxn in future)
  await algorand.send.payment({
    sender: dispenserAccount,
    receiver: cronAccount.addr,
    amount: AlgoAmount.Algos(5),
    note: 'Funding cron account',
  })
  console.log(`\nFunded cron account with 5 Algos`)

  // 5. Define the application ID
  const appID = BigInt(1001)

  // 6. Get accounts that have opted into the application
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

  // 7. Then in your main function:
  const users = await getAccountsWithLocalState(appID)
  console.log(`\nFound ${users.length} users who have opted into the app`)

  // 8. For each user, retrieve their local state from the app
  for (const user of users) {
    console.log(`\nProcessing local state for user: ${user}`)

    const userLocalState = await algorand.app.getLocalState(appID, user)

    // 9. Process each user's local state
    if (userLocalState) {
      // Local state is returned as a decoded object with various representations of the value
      const clickCountValue = userLocalState['l']

      let clickCount = 0
      if (clickCountValue) {
        if (typeof clickCountValue.value === 'bigint' || typeof clickCountValue.value === 'number') {
          clickCount = Number(clickCountValue.value)
        }
      }

      // 10. Check if there are pending actions to be processed
      if (clickCount > 0) {
        console.log(`\nUser ${user} has ${clickCount} clicks to process`)

        for (let i = 0; i < clickCount; i++) {
          // 11. Send a transaction for each click
          await algorand.send.payment({
            sender: cronAccount,
            receiver: cronAccount, // Send to itself
            amount: AlgoAmount.MicroAlgos(0), // Zero amount to simulate action
            note: `Triggered by app ${appID} - Click ${i + 1} for User ${user}`, // Unique note
          })
        }

        // // 12. Mark the action as processed by updating the smart contract
        // await algorand.send.appCall({
        //   appId: appID,
        //   sender: cronAccount,
        //   args: [
        //     new Uint8Array(Buffer.from(user)), // Convert user address string to Uint8Array
        //     new Uint8Array(Buffer.from('mark_processed')), // Convert string to Uint8Array
        //   ],
        // })

        console.log(`\nProcessed click for user ${user}`)
      }
    }
  }
}

// Execute the cron job every minute
cronJob().catch(console.error)
