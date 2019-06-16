import { Injectable } from "injection-js";

import { BaseMicroService } from "../../../src/base";
import { Registry } from "../../../src/registry";
import { HashingService } from "./hasher";

@Injectable()
export class Consumer extends BaseMicroService {
  constructor(registry: Registry, protected hasher: HashingService) {
    super(registry);
  }

  public async hashData(data: string) {
    return {
      value: data,
      hash: await this.hasher.sha512(data),
    };
  }
}
