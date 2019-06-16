import "reflect-metadata";

import { ReflectiveInjector } from "injection-js";

import { IPeerId, StartedRunner } from "../../src/lang";
import { Registry } from "../../src/registry";
import { Runner } from "../../src/runner";
import { PeerId, RunnerConfig } from "../../src/runner-config";

const mainRegistry: IPeerId = {
  id: {
    id: "QmPDX2uUt7pFYbRFYKZtw6n8QHs652kQKPHpRi523acHfD",
    // tslint:disable-next-line:max-line-length
    privKey: "CAASqAkwggSkAgEAAoIBAQD23J3LnuwjRsL2vGnnlIZU2f9xfT2lGd0t5g6K6SFA17YuWEmEP9tx/TwM2w3HoWYI8PJF111qWn0sTiLzqwjxC1+45TiUdH/hblgzt67s9KGXjNIvnSDnAVuySz8XEL6AKU8Ydsm0RQOrOlb5OYgVGaPPKMO6FOwnKbp1/To2J17wvHw+pUfJLuhk4mOLCX37KyaNZkB3xN9Fhc5u/jXstABwzoZXewMsLUHY8FmYLLpm2dEJGANHgWJupT4klbq2EhgnBbLbKQqmpRKjVQUvmSWOhZja+XcgN2tHT/+cvF3T4zIt2QOHMoF6XlRMff9HBmKYt4B/KWTt0C8Pr0l9AgMBAAECggEAYf/pAKnBcqunwE3B+TZEMbEtMD+Y1k8zOAJpaYntMpGv+CwCW2cCVflC+pOHn+WZ3RjSBRnfMtZjdNA8HeGbNh3ezUbqND0fez3T9AwKfHUNJV25Hz/QjQREA77Nd/mktrovdTXLEy6Gq1YIqv3E4SOBnT7AnMGrkkyFgkuZ7V7iP8leNDZZptFtDwBjHqVJcEI2Csc19OEqoNDlJ33E5giuZd2+hHfIvJlfsodmPev7OZB5c3tXLMSOVy8PI1p7aN/4caSVPqR6c6LL3JGrkWzASucW16L6MHVRI5wyoBMQt9yyCf4jA1MfZzgE4VS6wK3v4YJ2/v+vuEqR/e2uIQKBgQD8BhyhaAFDfcKTXZezaMupm9aY1u5vaoXLkKhd19jXaDkOtQUygyDWhkSHosPyUqHqrkAoPzwJKPmTthGV1kSEXO084TLmG4HE93JYEsMz0bKVlusZwTDhOnVQLCMHUpeFsP/gphEIQOgc41XGJhapkCiQCemj48IDYWOVQch3tQKBgQD6wafVvt9P8NP+q7+aNeW0R5mvOhnwPiYKLAdY85xO0zjJnxeoXstMtkL5cU8o2GXaG0GX+5JUgYBE6xSD550tYXbyOQgSuf0LS1ohx6CgEaE8BygGEKTrE17EnaCanOEcFIwjuD/6FFU/so+QqmC4wcWfAM3CJLrnQr3VsZsXqQKBgQCUT2hz18e+lvh1ToOikc4gbtP3t6wzJuW7qNJb/1TdVrkVHZQEaMRfWj5j73YOWXBtscORq7zByzosId3xZlmF50W5KPGSFqfkaJYCnHABQ6srete5nUYNlSBKYN7wRTtj8ohyBGhLih7OOT5V0D5P5MTqFttGlhardJls0XyObQKBgFbtUUBg1ctBokwTv+02p/WyKI29J4bIFKnMD5P/h30v7ey/MRVWH0XtnRQZ+qYfNlfAwSFtvZF7/zplAAyl+y/jLLfVm33aaeVDbvBs4rr6wZkspexMUs+HPIAOYMGYhtUULmynj84ixFa7kNdGqRcDXX28apfV4dEPqv1sf2ZZAoGBALmy5nsE9DuwpqQ9HudFp/qpVf5ApQYO9zTtTOb0LzmagWnLStJQjM1aMVKIZ4MpU/sWTw80ZFh8K1j0+au9cnyBbFLLx+QGNjCc5Rw+BYc2IdhxBH/CCM5OTBPCEWIc2eiq4BOAT1RuDFQTfQ0ymRLy/Dy4vbypx+fDBsjxmejH",
    // tslint:disable-next-line:max-line-length
    pubKey: "CAASpgIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQD23J3LnuwjRsL2vGnnlIZU2f9xfT2lGd0t5g6K6SFA17YuWEmEP9tx/TwM2w3HoWYI8PJF111qWn0sTiLzqwjxC1+45TiUdH/hblgzt67s9KGXjNIvnSDnAVuySz8XEL6AKU8Ydsm0RQOrOlb5OYgVGaPPKMO6FOwnKbp1/To2J17wvHw+pUfJLuhk4mOLCX37KyaNZkB3xN9Fhc5u/jXstABwzoZXewMsLUHY8FmYLLpm2dEJGANHgWJupT4klbq2EhgnBbLbKQqmpRKjVQUvmSWOhZja+XcgN2tHT/+cvF3T4zIt2QOHMoF6XlRMff9HBmKYt4B/KWTt0C8Pr0l9AgMBAAE=",
  },
  addresses: [ "/ip4/127.0.0.1/tcp/53085/ipfs/QmPDX2uUt7pFYbRFYKZtw6n8QHs652kQKPHpRi523acHfD" ],
};

const injector = ReflectiveInjector.resolveAndCreate([
  { provide: PeerId, useValue: mainRegistry },
  RunnerConfig,
  Runner,
  Registry,
]);

injector.get(Registry);
injector.get(Runner).start().then((runner: StartedRunner) => {
  // tslint:disable-next-line:no-console
  console.log("HashingService started", runner.peerId.addresses);
});
