export class Exception extends Error {
  constructor(
    public readonly domain: string,
    public readonly code: string,
    public readonly payload: any,
  ) {
    super(domain + ":" + code + " " + payload);
  }

  public toJSON() {
    return this.domain + ":" + this.code + " " + JSON.stringify(this.payload);
  }
}
