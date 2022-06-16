import { CeramicClient } from "@ceramicnetwork/http-client";
import { getResolver as get3IDResolver } from "@ceramicnetwork/3id-did-resolver";
import { ModelManager } from "@glazed/devtools";
import { model as basicProfileModel } from "@datamodels/identity-profile-basic";
import { getResolver as getKeyResolver, getResolver } from "key-did-resolver";
import { DID } from "dids";
import { Ed25519Provider } from "key-did-provider-ed25519";
import { DIDDataStore } from "@glazed/did-datastore";
import { TextEncoder } from "util";
import { ThreeIdProvider } from "@3id/did-provider";

const API_URL = "https://ceramic-clay.3boxlabs.com";

// return a did authentification to be use by ceramic client
// `seed` must be a 32-byte long Uint8Array
async function authenticateDID(seed) {
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

const main = async () => {
  const encoder = new TextEncoder();
  const seed = encoder.encode(process.env.SEED);
  const deployerDid = await authenticateDID(seed);
  const swearbyDid = await authenticateWithSecret(seed);
  console.log("did used to deploy model:", deployerDid.id);
  console.log("did to link swearby.io to:", swearbyDid.id);

  const ceramic = new CeramicClient(API_URL);
  ceramic.did = deployerDid;

  const manager2 = new ModelManager({ ceramic });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const schemaId = await manager2.createSchema("TrustDomainList", {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    title: "TrustDomainList",
    additionalProperties: {
      type: "object",
      required: ["trust"],
      properties: {
        trust: {
          type: "boolean",
          description:
            "indicate whether you trust (true), or distrust (false) the domain name",
        },
        comment: {
          type: "string",
          description: "tell why you trust/distrust this domain",
        },
      },
    },
  });

  console.log("schemaID", schemaId);

  const schemaURI = manager2.getSchemaURL(schemaId);
  console.debug(`Wrote schema to "${schemaURI}".`);

  const definitionId = await manager2.createDefinition("TrustDomainList", {
    name: "Swearby TrustDomainList",
    description:
      "List of trusted and not trusted domain name (that doesn't belong to a DID)",
    // @ts-ignore
    schema: schemaURI,
  });
  console.log("definitionId: ", definitionId);
  const encodedModel = manager2.toJSON();
  manager2.addJSONModel(encodedModel);
  const published2 = await manager2.deploy();
  console.log("published2: ", published2);

  ceramic.did = swearbyDid;
  const dataStore = new DIDDataStore({
    ceramic: ceramic,
    model: published2,
  });
  await dataStore.set("TrustDomainList", {
    "google.com": {
      trust: true,
    },
  });
  const content = await dataStore.get("TrustDomainList");
  console.log("content:", content);

  await dataStore.set("TrustDomainList", {
    "googlez.com": {
      trust: false,
      comment: "what a scammer! beware!",
    },
  });
  const content2 = await dataStore.get("TrustDomainList");
  console.log("content:", content2);
  console.log("googlez.com:", content2["googlez.com"]);
  process.exit();
};
main();
