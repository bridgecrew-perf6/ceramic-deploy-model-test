import { CeramicClient } from "@ceramicnetwork/http-client";
import { ModelManager } from "@glazed/devtools";
import { DIDDataStore } from "@glazed/did-datastore";
import { TextEncoder } from "util";
import {
  API_URL,
  authenticateDID,
  authenticateWithSecret,
} from "./utils/ceramic.mjs";

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
  const published2 = await manager2.deploy();
  console.log("published2: ", published2);

  ceramic.did = swearbyDid;
  const dataStore = new DIDDataStore({
    ceramic: ceramic,
    model: published2,
  });
  await dataStore.set("AlsoKnownAs", {
    accounts: [
      {
        protocol: "https",
        host: "swearby.io",
        id: "swearby.io",
        claim: "swearby.io/linked-did.json",
      },
    ],
  });
  const content = await dataStore.get("AlsoKnownAs");
  console.log("content:", content);
  process.exit();
};
main();
