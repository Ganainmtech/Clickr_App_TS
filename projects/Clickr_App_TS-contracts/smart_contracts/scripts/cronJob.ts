import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount'
import { ClickrLogicClient } from '../artifacts/clickr_logic/clickrLogicClient'

async function cronJob() {
  const algorand = AlgorandClient.fromEnvironment()
  const cronAccount = await algorand.account.fromKmd('lora-dev')
  console.log(`Using cron account: ${cronAccount.addr}`)

  const appId = 1019n
  const app = await algorand.app.getById(appId);
  const appAddress = app.appAddress;
  const appClient = algorand.client.getTypedAppClientById(ClickrLogicClient, { appId })
  const dispenserAccount = await algorand.account.localNetDispenser()
  console.log(`\nUsing LocalNet dispenser account: ${dispenserAccount.addr}`)

  // Check if cronAccount is already opted in
  const cronLocalState = await algorand.app.getLocalState(appId, cronAccount.addr)
  if (!cronLocalState) {
    try {
      await appClient.send.optIn.optIn({
        sender: cronAccount.addr,
        signer: cronAccount.signer,
        args: [],
      })
      console.log(`Cron account ${cronAccount.addr} successfully opted in!`)
    } catch (error) {
      console.error(`Opt-in failed:`, error)
    }
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

  console.log(`\nCalling distributeRewards...`)
  try {
    const rewardTxnResult = await appClient.send.distributeRewards({
      sender: cronAccount.addr,
      signer: cronAccount.signer,
      args: {},
      coverAppCallInnerTransactionFees: true,
      maxFee: AlgoAmount.MicroAlgos(10000),
    })
    console.log(`Transaction confirmed: ${rewardTxnResult.transaction.txID()}`);
    } catch (error) {
    console.error(`Error distributing rewards:`, error)
  }

  console.log(`\nReward distribution complete!`)
}


// Execute the cron job
cronJob().catch(console.error)
