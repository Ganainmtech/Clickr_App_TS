import type { Account, uint64 } from '@algorandfoundation/algorand-typescript'
import { abimethod, assert, Contract, LocalState, Txn, Uint64 } from '@algorandfoundation/algorand-typescript'

export class clickrLogic extends Contract {
  // The user click count
  clickCount = LocalState<uint64>({ key: 'l' })

  @abimethod({
    onCreate: 'require',
  })
  public createApplication(): void {}

  // Opt-in method for users to interact with the contract
  @abimethod({ allowActions: 'OptIn' })
  public optIn(): void {
    this.clickCount(Txn.sender).value = Uint64(0)
  }

  // Record a click for a user
  @abimethod()
  public recordClick(): void {
    // Get the sender of the transaction (the user who is calling the method)
    const user = Txn.sender

    // Only the user can record a click
    assert(Txn.sender === user, 'Only the user can record a click')

    // Update the user's click count
    const currentCount = this.clickCount(user).value || Uint64(0)
    this.clickCount(user).value = currentCount + Uint64(1)
  }

  // Retrieve the click count for a specific user
  @abimethod()
  public getClickCount(user: Account): uint64 {
    return this.clickCount(user).value || Uint64(0)
  }

  @abimethod()
  public clickProcessed(user: Account): void {
    // Only allow the cron account (Txn.sender) to mark clicks as processed
    //assert(Txn.sender === Global.creatorAddress, 'Only the cron account can mark clicks as processed')

    // Reset the user's click count to 0
    this.clickCount(user).value = Uint64(0)
  }
}
