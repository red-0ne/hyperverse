import "reflect-metadata";

import { ReflectiveInjector } from "injection-js";

import { dependencyBundleFactory } from "../core/bundle-di";
import { ContactsManager, contactsManagerToken } from "./services/contacts-manager/contacts-manager";
import { Contacts } from "./types/contacts";
import { VirtualStorageManager } from "./services/storage-manager/virtual-storage-manager";
import { UserId } from "./types/user";

class AppDeps extends dependencyBundleFactory({
  contactsManager: contactsManagerToken,
}) { }

const deps = AppDeps
  .provide("contactsManager").asClass(ContactsManager)
  .seal()

const contactsManagerDeps = ContactsManager.deps
  .provide("storageManager").asClass(VirtualStorageManager)
  .seal();


const injector = ReflectiveInjector.resolveAndCreate([contactsManagerDeps, deps]);

const appDeps = injector.get(AppDeps) as AppDeps;
const contactsDTO = {
  phones: [],
  addresses: [{ city: "Setif", countryCode: "DZ", streetName: "Cite telidjene", streetNumber: 3, zipCode: 19000 }],
  emails: ["foo@bar.baz"],
};

(async () => {
  const id = new UserId("foo");
  await appDeps.contactsManager.setContacts(id, new Contacts(contactsDTO));
  const c = await appDeps.contactsManager.getContacts(id)
  console.log(c?.addresses[0].streetName)
})()