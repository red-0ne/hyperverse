import "reflect-metadata";

import { ReflectiveInjector } from "injection-js";

import { IPeerId, StartedRunner } from "../../src/lang";
import { ExternalRegistries, Registry } from "../../src/registry";
import { Runner } from "../../src/runner";
import { HashingService } from "./classes/hasher";

const mainRegistry: IPeerId = {
  id: {
    id: "QmPDX2uUt7pFYbRFYKZtw6n8QHs652kQKPHpRi523acHfD",
    // tslint:disable-next-line:max-line-length
    pubKey: "CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQD23J3LnuwjRsL2vGnnlIZU2f9xfT2lGd0t5g6K6SFA17YuWEmEP9tx/TwM2w3HoWYI8PJF111qWn0sTiLzqwjxC1+45TiUdH/hblgzt67s9KGXjNIvnSDnAVuySz8XEL6AKU8Ydsm0RQOrOlb5OYgVGaPPKMO6FOwnKbp1/To2J17wvHw+pUfJLuhk4mOLCX37KyaNZkB3xN9Fhc5u/jXstABwzoZXewMsLUHY8FmYLLpm2dEJGANHgWJupT4klbq2EhgnBbLbKQqmpRKjVQUvmSWOhZja+XcgN2tHT/+cvF3T4zIt2QOHMoF6XlRMff9HBmKYt4B/KWTt0C8Pr0l9AgMBAAE=",
  },
  addresses: [ "/ip4/127.0.0.1/tcp/53085/ipfs/QmPDX2uUt7pFYbRFYKZtw6n8QHs652kQKPHpRi523acHfD" ],
};

const injector = ReflectiveInjector.resolveAndCreate([
  { provide: ExternalRegistries, useValue: [ mainRegistry ] },
  Runner,
  Registry,
  HashingService,
]);

injector.get(HashingService);
injector.get(Runner).start().then((runner: StartedRunner) => {
  // tslint:disable-next-line:no-console
  console.log("HashingService started", runner.peerId.addresses);
});
