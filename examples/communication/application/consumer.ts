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
      // We use the hasher service transparently whether the service is running
      // in the same VM, on the same hardware but different processes or on a remote machine
      // All typescript typings are green, so we have typechecking between possibly remote services
      // and without any additional glue work
      hash: await this.hasher.sha512(data),
      value: data,
    };
  }
}
