import { Exception } from "./errors";
import { IConstructor } from "./lang";
import { Registry } from "./registry";

export class BaseMicroService {

  constructor(registry: Registry) {
    registry.registerLocalService(this);
  }

  public is(component: IConstructor<any>) {
    return (this as any).constructor.components.includes(component);
  }

  public onInvalidParameter(method: string, index: number, value: any) {
    throw new Exception("CORE", "INVALID_PARAMETER", { method, index, value });
  }
}
