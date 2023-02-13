import { Injectable, InjectionToken } from "injection-js";

import { dependencyBundleFactory } from "../../../core/bundle-di";
import { Contacts } from "../../types/contacts";
import { UserId } from "../../types/user";
import { storageManagerToken, StorageManager } from "../storage-manager/storage-manager";

@Injectable()
class ContactsManagerDeps extends dependencyBundleFactory({
  storageManager: storageManagerToken,
}) { }

@Injectable()
export class ContactsManager {
  static readonly deps = ContactsManagerDeps;
  protected readonly storageManager: StorageManager;

  constructor({ storageManager }: ContactsManagerDeps) {
    this.storageManager = storageManager;
  }

  public async setContacts(id: UserId, contacts: Contacts): Promise<void> {
    contacts.addresses[0].city;
    return this.storageManager.save(id, contacts);
  }

  public async getContacts(id: UserId): Promise<Contacts | null> {
    const user = await this.storageManager.get(id);

    if (user) {
      return new Contacts(user.contacts);
    } else {
      return null;
    }
  }

  async deleteContacts(id: UserId): Promise<void> {
    await this.storageManager.save(id, new Contacts({ addresses: [], emails: [], phones: [] }));
  }
}

export const contactsManagerToken = new InjectionToken<ContactsManager>("ContactsManager");