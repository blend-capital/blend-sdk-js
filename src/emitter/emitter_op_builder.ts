import { Address, Contract } from 'stellar-base';

export class EmitterOpBuilder {
  _contract: Contract;

  constructor(address: string) {
    this._contract = new Contract(address);
  }

  public initialize({
    backstop,
    blnd_token_id,
  }: {
    backstop: string;
    blnd_token_id: string;
  }): string {
    const invokeArgs = {
      method: 'initialize',
      args: [
        ((i) => Address.contract(Buffer.from(i, 'hex')).toScVal())(backstop),
        ((i) => Address.contract(Buffer.from(i, 'hex')).toScVal())(blnd_token_id),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public distribute(): string {
    const invokeArgs = { method: 'distribute', args: [] };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public get_backstop(): string {
    const invokeArgs = { method: 'get_backstop', args: [] };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public swap_backstop({ new_backstop_id }: { new_backstop_id: string }): string {
    const invokeArgs = {
      method: 'swap_backstop',
      args: [((i) => Address.contract(Buffer.from(i, 'hex')).toScVal())(new_backstop_id)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }
}
