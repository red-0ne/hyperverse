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

  public captureStdIn(callback: (line: string) => void) {
    let buffer: string = "";

    process.stdin.on("data", (data: string) => {
      let lines: string[];
      buffer += data;

      [ buffer, ...lines ] = buffer.split("\n").reverse();
      lines.map(callback);
    });
  }
}
