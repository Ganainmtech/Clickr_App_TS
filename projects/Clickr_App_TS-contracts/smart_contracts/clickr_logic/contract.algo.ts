import type { Account, uint64 } from '@algorandfoundation/algorand-typescript'
import { abimethod, assert, Contract, LocalState, Txn, Uint64 } from '@algorandfoundation/algorand-typescript'

export class clickrLogic extends Contract {
  // The user click count
  clickCount = LocalState<uint64>({ key: 'l' })

  // The user heart count
  heartCount = LocalState<uint64>({ key: 'h'})

  // The user highest click count stores
  highestClickCount = LocalState<uint64>({ key: 'c'})

  @abimethod({
    onCreate: 'require',
  })
  public createApplication(): void {}

  // Opt-in method for users to interact with the contract
  @abimethod({ allowActions: 'OptIn' })
  public optIn(): void {
    this.clickCount(Txn.sender).value = Uint64(0) // start at 0 clicks count
    this.heartCount(Txn.sender).value = Uint64(5) // start with 5 hearts
    this.highestClickCount(Txn.sender).value = Uint64(0) // storage for highest user click count 
  }

  // Record a click for a user
  @abimethod()
  public recordClick(): void {
    // Get the sender of the transaction (the user who is calling the method)
    const user = Txn.sender

    // Only the user can record a click
    assert(Txn.sender === user, 'Only the user can record a click')

    assert(this.heartCount(user).value > 0, 'Only if user hearts are above 0 record click')

    // Update the user's click count
    const currentCount = this.clickCount(user).value || Uint64(0)
    this.clickCount(user).value = currentCount + Uint64(1)
  }

  // Retrieve the click count for a specific user
  @abimethod()
  public getClickCount(user: Account): uint64 {
    return this.clickCount(user).value || Uint64(0)
  }

  // Retrieve the click count for a specific user
  @abimethod()
  public getHighestClickCount(user: Account): uint64 {
    return this.highestClickCount(user).value || Uint64(0)
  }
  
  // Retrieve the click count for a specific user
  @abimethod()
  public getHeartCount(user: Account): uint64 {
    return this.heartCount(user).value || Uint64(0)
  }

  @abimethod()
  public clickProcessed(user: Account): void {
    // Only allow the cron account (Txn.sender) to mark clicks as processed
    //assert(Txn.sender === Global.creatorAddress, 'Only the cron account can mark clicks as processed')

    const currentClicks = this.clickCount(user).value || Uint64(0)
    const highestClicks = this.highestClickCount(user).value || Uint64(0)

    if (currentClicks > highestClicks) {
      this.highestClickCount(user).value = currentClicks
    }

    // Reset the user's click count to 0
    this.clickCount(user).value = Uint64(0)
  }

  @abimethod()
  public decrementHeart(user: Account): void {
    assert (this.heartCount(user).value > 0, 'To decrement hearts there has to be atleast 1')

    // Decrement users heart count by one when called
    this.heartCount(user).value -= 1;
  }
}
