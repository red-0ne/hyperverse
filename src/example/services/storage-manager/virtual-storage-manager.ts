import { Injectable } from "injection-js";
import { Infer } from "myzod";
import { Contacts } from "../../types/contacts";
import { User, UserId, userSchema } from "../../types/user";
import { StorageManager } from "./storage-manager";

@Injectable()
export class VirtualStorageManager implements StorageManager {
  protected readonly users: Record<string, Infer<typeof userSchema> | undefined> = {
    "foo": {
      fullName: "Mister Foo",
      userId: new UserId("foo"),
      contacts: null,
    },
  }

  async save(id: UserId, contacts: Contacts | null): Promise<void> {
    const user = this.users[id.value];
    if (user) {
      user.contacts = contacts || null;
    }
  }

  async get(id: UserId): Promise<User | undefined> {
    return new User(this.users[id.value]);
  }
}