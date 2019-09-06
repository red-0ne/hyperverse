import { Injectable } from "injection-js";

import { createHash } from "crypto";
import { BaseMicroService } from "../../../src/base";
import { Channel } from "../../../src/decorators";
import { Registry } from "../../../src/registry";

@Injectable()
export class HashingService extends BaseMicroService {
  constructor(registry: Registry) {
    super(registry);
  }

  @Channel
  public async sha512(data: string) {
    const hash = createHash("sha512");
    return hash.update(data, "utf8").digest("hex");
  }
}
