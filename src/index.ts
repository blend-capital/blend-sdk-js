import { Address } from 'stellar-base';

export class TestObject extends Address {
  public objNumber: number;

  constructor(num: number, id: string) {
    super(id);
    this.objNumber = num;
  }
}
