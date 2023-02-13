import { InjectionToken } from "injection-js";
import { Contacts } from "../../types/contacts";
import { User, UserId } from "../../types/user";

export interface StorageManager {
  get(id: UserId): Promise<User | undefined>;
  save(id: UserId, contacts: Contacts): Promise<any>;
}

export const storageManagerToken = new InjectionToken<StorageManager>("StorageManager");