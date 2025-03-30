import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount'
import { ClickrLogicClient } from '../artifacts/clickr_logic/clickrLogicClient'

async function cronJob() {
  const algorand = AlgorandClient.fromEnvironment()
  const cronAccount = await algorand.account.fromKmd('lora-dev')
  console.log(`Using cron account: ${cronAccount.addr}`)

  const appId = 1279n
  const app = await algorand.app.getById(appId)
  const appAddress = app.appAddress
  const appClient = algorand.client.getTypedAppClientById(ClickrLogicClient, { appId })
  const dispenserAccount = await algorand.account.localNetDispenser()
  console.log(`\nUsing LocalNet dispenser account: ${dispenserAccount.addr}`)

  // Check if the cron account is already opted in to the app
  try {
    // Fetch account info to check if opted in
    const accountInfo = await algorand.client.algod.accountInformation(cronAccount.addr).do()
    const isOptedIn = accountInfo.appsLocalState?.some((app) => BigInt(app.id) === BigInt(appId)) || false

    if (!isOptedIn) {
      console.log(`Cron account ${cronAccount.addr} is NOT opted in. Opting in...`)

      try {
        // Opt-in the cron account to the app
        await appClient.send.optIn.optIn({
          sender: cronAccount.addr,
          signer: cronAccount.signer,
          args: [],
        })
        console.log(`Cron account ${cronAccount.addr} successfully opted in!`)
      } catch (error: unknown) {
        // Properly handle the error and log it
        const err = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Opt-in failed for cron account ${cronAccount.addr}:`, err)

        // Optionally log more error details for debugging
        if (error instanceof Error && (error as any).response) {
          console.error('Error response:', (error as any).response)
        }
        return // Exit early if opt-in fails
      }
    } else {
      console.log(`Cron account ${cronAccount.addr} is already opted in.`)
    }
  } catch (error) {
    console.error(`Failed to retrieve account info for ${cronAccount.addr}:`, error)
  }

  // Fund app with 3 Algos if needed
  await algorand.send.payment({
    sender: dispenserAccount,
    receiver: appAddress,
    amount: AlgoAmount.Algos(3),
    note: 'Funding app account',
  })
  console.log(`\nFunded app account with 3 Algos`)

  // Get accounts with local state
  async function getAccountsWithLocalState(appID: bigint) {
    try {
      const response = await algorand.client.indexer.searchAccounts().applicationID(appID).do()
      return response.accounts.map((account: { address: string }) => account.address)
    } catch (error) {
      console.error('Error getting accounts with local state:', error)
      return []
    }
  }

  const users = await getAccountsWithLocalState(appId)
  console.log(`\nFound ${users.length} users who have opted into the app`)

  for (const user of users) {
    console.log(`\nProcessing local state for user: ${user}`)
    const userLocalState = await algorand.app.getLocalState(appId, user)

    if (userLocalState) {
      const clickCountValue = userLocalState['l']
      let clickCount = clickCountValue ? Number(clickCountValue.value) : 0

      if (clickCount > 0) {
        console.log(`\nUser ${user} has ${clickCount} clicks to process`)

        for (let i = 0; i < clickCount; i++) {
          await algorand.send.payment({
            sender: cronAccount,
            receiver: cronAccount,
            amount: AlgoAmount.MicroAlgos(0),
            note: `Triggered by app ${appId} - Click ${i + 1} for User ${user}`,
          })
        }

        await appClient.send.clickProcessed({
          sender: cronAccount,
          signer: cronAccount.signer,
          args: { user },
        })
        console.log(`\nProcessed clicks for user ${user}`)
      }
    }
  }

  // First distribute rewards transaction
  console.log(`\nCalling distributeRewards...`)
  try {
    const rewardTxnResult = await appClient.send.distributeRewards({
      sender: cronAccount.addr,
      signer: cronAccount.signer,
      args: {},
      coverAppCallInnerTransactionFees: true,
      maxFee: AlgoAmount.MicroAlgos(10000),
    })

    console.log(`Distribute rewards transaction confirmed: ${rewardTxnResult.transaction.txID()}`)
    console.log(`\nReward distribution complete!`)
  } catch (error) {
    console.error('Error during reward distribution:', error)
  }
}

// Execute the cron job
cronJob().catch(console.error)
