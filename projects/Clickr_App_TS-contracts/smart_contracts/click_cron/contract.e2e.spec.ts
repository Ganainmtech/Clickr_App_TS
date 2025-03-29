import { algorandFixture } from '@algorandfoundation/algokit-utils/testing'
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount'
import { expect, test } from 'vitest'
import { ClickCronFactory } from '../artifacts/click_cron/ClickCronClient'

test('Click Cron > records clicks and creates delegated transactions', async () => {
  console.log('\n=== Starting Click Cron Test ===\n')

  /* [ARCHIVED TEST FTM] */
  // 1. Set up the test environment
  const fixture = await algorandFixture()
  await fixture.newScope()
  const { algorand, testAccount } = fixture.context

  // Create a separate Cron account
  const cronAccount = await algorand.account.random()
  console.log('Cron Account:', cronAccount.addr)

  // Fund the Cron account with some Algos
  await algorand.send.payment({
    sender: testAccount,
    receiver: cronAccount.addr,
    amount: AlgoAmount.Algos(1), // Fund with 1 Algo
  })
  console.log('Cron Account funded.')

  // 2. Deploy the Click Cron contract
  console.log('\n1. Deploying Click Cron...')
  const factory = algorand.client.getTypedAppFactory(ClickCronFactory, {
    defaultSender: testAccount.addr,
  })
  const { appClient } = await factory.deploy({
    onUpdate: 'append',
    onSchemaBreak: 'append',
  })
  console.log('Click Cron deployed with ID:', appClient.appId)

  // 3. Create the application
  console.log('\n2. Creating application...')
  await appClient.send.createApplication({
    args: {
      admin: testAccount.addr.toString(),
    },
  })
  console.log('Application created with admin:', testAccount.addr.toString())
  
  // Get the application address
  const appAddress = appClient.appAddress
  console.log('Application address:', appAddress)

  // 4. Rekey the cron account to the application address
  // This allows the application to control the cron account
  console.log('\n3. Rekeying cron account to application...')
  await algorand.send.payment({
    sender: cronAccount,
    rekeyTo: appAddress,
    amount: AlgoAmount.MicroAlgos(0),
    receiver: cronAccount.addr,
  })
  console.log('Cron account rekeyed to application address')

  // 5. Set up the cron account in the application
  console.log('\n4. Setting cron account in application...')
  await appClient.send.setCronAccount({
    args: {
      account: cronAccount.addr.toString(),
    },
  })
  console.log('Cron account set to:', cronAccount.addr.toString())

  // 6. Opt in to the application
  console.log('\n5. Opting in to application...')
  await appClient.send.optIn.optIn({
    sender: testAccount,
    args: {},
  })
  console.log('Successfully opted in to application')

  // 7. Record clicks
  console.log('\n6. Recording clicks...')
  await appClient.send.recordClick({
    maxFee: AlgoAmount.MicroAlgos(10000),
    args: {},
    coverAppCallInnerTransactionFees: true,
  })
  console.log('First click recorded')

  await appClient.send.recordClick({
    maxFee: AlgoAmount.MicroAlgos(10000),
    args: {},
    coverAppCallInnerTransactionFees: true,
  })
  console.log('Second click recorded')

  // 8. Get and verify the click count
  console.log('\n7. Getting click count...')
  const result = await appClient.send.getClickCount({
    args: {
      user: testAccount.addr.toString(),
    },
  })
  console.log('Click count:', result.return)

  // Verify we got exactly two clicks
  expect(result.return).toBe(2n)
  console.log('\nTest passed! Click count is correct.')
})
