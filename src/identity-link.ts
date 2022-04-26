import CeramicClient from "@ceramicnetwork/http-client";
import { ModelManager } from "@glazed/devtools";
import { model as basicProfileModel } from "@datamodels/identity-profile-basic";
import { Ed25519Provider } from "key-did-provider-ed25519";
import { getResolver } from "key-did-resolver";
import { DID } from "dids";
import { DIDDataStore } from "@glazed/did-datastore";

// the following got helpt me :
// https://github.com/MetaFam/TheGame/blob/develop/packages/utils/bin/create-model.mjs

// return a did authentification to be use by ceramic client
// `seed` must be a 32-byte long Uint8Array
async function authenticateDID(seed: Uint8Array) {
  const provider = new Ed25519Provider(seed);
  const did = new DID({ provider, resolver: getResolver() });
  await did.authenticate();
  return did;
}

const main = async () => {
  const API_URL = "https://ceramic-clay.3boxlabs.com";
  const seed = new Uint8Array(32); // shoud use random bytes
  const newDid = await authenticateDID(seed);
  console.log("did used to deploy model:", newDid.id);

  const ceramic = new CeramicClient(API_URL);
  ceramic.did = newDid;

  const manager = new ModelManager(ceramic);
  manager.addJSONModel(basicProfileModel);

  const published = await manager.toPublished();
  console.log("published: ", published);

  const manager2 = new ModelManager(ceramic);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const schemaId = await manager2.createSchema("AlsoKnownAs", {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    title: "AlsoKnownAs",
    properties: {
      accounts: {
        type: "array",
        items: {
          $ref: "#/definitions/Account",
        },
      },
    },
    additionalProperties: false,
    required: ["accounts"],
    definitions: {
      // @ts-ignore
      Attestation: {
        type: "object",
        properties: {
          "did-jwt": {
            type: "string",
            maxLength: 1000,
          },
          "did-jwt-vc": {
            type: "string",
            maxLength: 1000,
          },
        },
      }, // @ts-ignore
      Account: {
        type: "object",
        properties: {
          protocol: {
            type: "string",
            maxLength: 50,
          },
          host: {
            type: "string",
            maxLength: 150,
          },
          id: {
            type: "string",
            maxLength: 450,
          },
          claim: {
            type: "string",
            maxLength: 450,
          },
          attestations: {
            type: "array",
            items: {
              $ref: "#/definitions/Attestation",
            },
          },
        },
        required: ["protocol", "id"],
      },
    },
  });

  console.log("schemaID", schemaId);

  const schemaURI = manager2.getSchemaURL(schemaId);
  console.debug(`Wrote schema to "${schemaURI}".`);

  const definitionId = await manager2.createDefinition("AlsoKnownAs", {
    name: "Also Known As",
    description:
      "https://github.com/ceramicnetwork/CIP/blob/main/CIPs/CIP-23/CIP-23.md",
    // @ts-ignore
    schema: schemaURI,
  });
  console.log("definitionId: ", definitionId);
  const encodedModel = manager2.toJSON();
  manager2.addJSONModel(encodedModel);
  const published2 = await manager2.toPublished();
  console.log("published2: ", published2);

  const dataStore = new DIDDataStore({
    ceramic: ceramic,
    model: published2,
  });
  const basicProfileContent = await dataStore.set("AlsoKnownAs", {
    accounts: [
      {
        protocol: "https",
        host: "solana.com",
        id: "solana.com",
        claim: "solana.com/did-linked.json",
      },
    ],
  });
};
main();
