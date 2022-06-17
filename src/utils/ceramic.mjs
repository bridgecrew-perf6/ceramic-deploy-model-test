import { CeramicClient } from "@ceramicnetwork/http-client";
import { getResolver as get3IDResolver } from "@ceramicnetwork/3id-did-resolver";
import { getResolver as getKeyResolver, getResolver } from "key-did-resolver";
import { DID } from "dids";
import { Ed25519Provider } from "key-did-provider-ed25519";
import { ThreeIdProvider } from "@3id/did-provider";
export const API_URL = "https://ceramic-clay.3boxlabs.com";

// return a did authentification to be use by ceramic client
// `seed` must be a 32-byte long Uint8Array
export async function authenticateDID(seed) {
  const provider = new Ed25519Provider(seed);
  const did = new DID({ provider, resolver: getResolver() });
  await did.authenticate();
  return did;
}

// `authSecret` must be a 32-byte long Uint8Array
// TODO: find out what the authId is supose to be ?
// TODO: send back ceramic client is will be used everywhere in the app...
export async function authenticateWithSecret(authSecret) {
  const ceramic = new CeramicClient(API_URL);

  const threeID = await ThreeIdProvider.create({
    authId: "myAuthID",
    authSecret,
    // See the section above about permissions management
    getPermission: (request) => Promise.resolve(request.payload.paths),
    // @ts-ignore
    ceramic: ceramic,
  });

  const did = new DID({
    provider: threeID.getDidProvider(),
    resolver: {
      ...get3IDResolver(ceramic),
      ...getKeyResolver(),
    },
  });

  // Authenticate the DID using the 3ID provider
  await did.authenticate();

  // The Ceramic client can create and update streams using the authenticated DID
  ceramic.did = did;
  return did;
}
