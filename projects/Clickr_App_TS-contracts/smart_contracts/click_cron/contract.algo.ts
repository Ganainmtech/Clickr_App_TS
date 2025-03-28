import type { Account, uint64 } from '@algorandfoundation/algorand-typescript';
import {
  abimethod,
  assert,
  Contract,
  Global,
  GlobalState,
  itxn,
  LocalState,
  LogicSig,
  TransactionType,
  Txn,
  Uint64,
} from '@algorandfoundation/algorand-typescript';

/**
 * Delegated Logic Signature that allows the cron account to send transactions
 */
export class CronLogicSig extends LogicSig {
  public program(): boolean {
    return (
      Txn.typeEnum === TransactionType.Payment &&
      Txn.amount === 0 && // Self-payment with zero amount
      Txn.receiver === Txn.sender && // Ensure it's sending to itself
      Txn.rekeyTo === Global.zeroAddress && // Prevent rekeying
      Txn.closeRemainderTo === Global.zeroAddress && // Prevent closing
      Txn.fee === Global.minTxnFee // Ensure minimum fee
    );
  }
}

export class ClickCron extends Contract {
  admin = GlobalState<Account>({ key: 'a' });
  cronAccount = GlobalState<Account>({ key: 'c' });
  clickCount = LocalState<uint64>({ key: 'c' });

  @abimethod()
  public createApplication(admin: Account): void {
    this.admin.value = admin;
  }

  @abimethod({ allowActions: 'OptIn' })
  public optIn(): void {
    this.clickCount(Txn.sender).value = Uint64(0);
  }

  @abimethod()
  public setCronAccount(account: Account): void {
    assert(Txn.sender === this.admin.value, 'Only admin can set cron account');
    this.cronAccount.value = account;
  }

  @abimethod()
  public recordClick(): void {
    assert(this.cronAccount.hasValue, 'Cron account not set');
    const currentCount = this.clickCount(Txn.sender).value || Uint64(0);
    this.clickCount(Txn.sender).value = currentCount + Uint64(1);

    // Use the cron account (delegated LogicSig) to send a real transaction
    itxn
      .payment({
        sender: this.cronAccount.value, // Transaction comes from the cron account
        receiver: this.cronAccount.value, // Dummy transaction to itself for now
        amount: 0,
        fee: 0, // Bob's outer transaction covers fees
      })
      .submit();
  }

  @abimethod()
  public getClickCount(user: Account): uint64 {
    return this.clickCount(user).value || Uint64(0);
  }
}
