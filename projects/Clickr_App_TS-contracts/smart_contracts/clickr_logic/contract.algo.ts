import {
  abimethod,
  Account,
  assert,
  Contract,
  Global,
  GlobalState,
  itxn,
  LocalState,
  Txn,
  uint64,
  Uint64,
} from '@algorandfoundation/algorand-typescript'

export class clickrLogic extends Contract {
  // The highest click count across all users
  highestClickCount = GlobalState<uint64>({ key: 'g' })

  // The address who holds the highest click count
  highestClickCountAddress = GlobalState<Account>({ key: 'd' })

  // Laste reward time
  lastRewardTime = GlobalState<uint64>({ key: 'e' })

  // The user click count
  userClickCount = LocalState<uint64>({ key: 'a' })

  // The user heart count
  userHeartCount = LocalState<uint64>({ key: 'b' })

  // The user highest click count stores
  userHighestClickCount = LocalState<uint64>({ key: 'c' })

  // The user all time click count
  useAllTimeClickCount = LocalState<uint64>({ key: 'l' })

  @abimethod({
    onCreate: 'require',
  })
  public createApplication(): void {
    this.highestClickCount.value = Uint64(0) // Initialize global highest click count
    this.highestClickCountAddress.value = Global.creatorAddress // initlise with a default address
    this.lastRewardTime.value = Uint64(0) // Initialize last reward time to 0 initially (can be updated to actual deploy timestamp later)
  }

  // Opt-in method for users to interact with the contract
  @abimethod({ allowActions: 'OptIn' })
  public optIn(): void {
    this.userClickCount(Txn.sender).value = Uint64(0) // start at 0 clicks count
    this.userHeartCount(Txn.sender).value = Uint64(5) // start with 5 hearts
    this.userHighestClickCount(Txn.sender).value = Uint64(0) // storage for highest user click count
    this.useAllTimeClickCount(Txn.sender).value = Uint64(0) // storage for user all time click count
  }

  // Record a click for a user
  @abimethod()
  public recordClick(): void {
    // Get the sender of the transaction (the user who is calling the method)
    const user = Txn.sender

    // Only the user can record a click
    assert(Txn.sender === user, 'Only the user can record a click')

    assert(this.userHeartCount(user).value > 0, 'Only if user hearts are above 0 record click')

    // Update the user's click count
    const currentCount = this.userClickCount(user).value || Uint64(0)
    this.userClickCount(user).value = currentCount + Uint64(1)
    this.useAllTimeClickCount(user).value = currentCount + Uint64(1)
  }

  // Retrieve the click count for a specific user
  @abimethod()
  public getClickCount(user: Account): uint64 {
    return this.userClickCount(user).value || Uint64(0)
  }

  // Retrieve the click count for a specific user
  @abimethod()
  public getHighestClickCount(user: Account): uint64 {
    return this.userHighestClickCount(user).value || Uint64(0)
  }

  // Retrieve the click count for a specific user
  @abimethod()
  public getHeartCount(user: Account): uint64 {
    return this.userHeartCount(user).value || Uint64(0)
  }

  // Retrieve the click count for a specific user
  @abimethod()
  public getUserAllTimeClickCount(user: Account): uint64 {
    return this.useAllTimeClickCount(user).value || Uint64(0)
  }

  @abimethod()
  public clickProcessed(user: Account): void {
    // Only allow the cron account to mark clicks as processed
    // assert()

    // Retrieve the current and highest user click counts
    const currentClicks = this.userClickCount(user).value
    const highestClicks = this.userHighestClickCount(user).value

    // If the current click count exceeds their previous highest
    if (currentClicks > highestClicks) {
      // Update the user's highest recorded click count
      this.userHighestClickCount(user).value = currentClicks
    }

    // Check if this user's new highest click count surpasses the global record
    if (currentClicks > this.highestClickCount.value) {
      this.highestClickCount.value = currentClicks
      this.highestClickCountAddress.value = user
    }

    // Reset the user's click count to 0
    this.userClickCount(user).value = Uint64(0)
  }

  @abimethod()
  public decrementHeart(user: Account): void {
    assert(this.userHeartCount(user).value > 0, 'To decrement hearts there has to be atleast 1')

    // Decrement users heart count by one when called
    this.userHeartCount(user).value -= 1
  }

  /**
   * Distributes the contract's balance to the user with the highest global click count.
   * The fee is set to 0 so the sender of the app call covers the transaction fee.
   * The sender of the payment is the smart contract's own balance.
   */
  @abimethod()
  public distributeRewards(): void {
    // Ensure that only the authorized cron address can call this method
    // assert(Txn.sender === this.authorizedCronAddress.value, "Only authorized cron can call this");

    // Get the current application address
    const appAddress = Global.currentApplicationAddress

    // Calculate available balance (subtract min balance for the application)
    const availableBalance: uint64 = Uint64(appAddress.balance) - Uint64(Global.minBalance)

    // Check that there is enough balance to distribute
    assert(availableBalance > Uint64(0), 'No available balance to send')

    // Ensure we have a valid highest click count address
    assert(this.highestClickCountAddress.value !== Global.zeroAddress, 'No highest click holder found')

    // Perform the transaction to the highest click count address
    itxn
      .payment({
        amount: availableBalance,
        receiver: this.highestClickCountAddress.value,
        fee: 0,
      })
      .submit()

    // Update the last distribution time (optional, if you still want to track it)
    // this.lastRewardTime.value = Global.latestTimestamp;
  }
}
