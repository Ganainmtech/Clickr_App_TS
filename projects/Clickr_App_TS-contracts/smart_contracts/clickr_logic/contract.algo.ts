import { Contract } from '@algorandfoundation/algorand-typescript'

export class ClickrLogic extends Contract {
  public hello(name: string): string {
    return `Hello, ${name}`
  }
}
