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
  const schemaId = await manager2.createSchema("TrustList", {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    title: "TrustList",
    additionalProperties: {
      type: "object",
      required: ["trust"],
      properties: {
        trust: {
          type: "boolean",
          description:
            "indicate whether you trust (true), or distrust (false) the did",
        },
        comment: {
          type: "string",
          description: "tell why you trust/distrust this did",
        },
      },
    },
  });

  console.log("schemaID", schemaId);

  const schemaURI = manager2.getSchemaURL(schemaId);
  console.debug(`Wrote schema to "${schemaURI}".`);

  const definitionId = await manager2.createDefinition("TrustList", {
    name: "Swearby TrustList",
    description: "List of DID trusted/not trusted",
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
  await dataStore.set("TrustList", {
    "did:3id:helltoto": {
      trust: true,
    },
  });
  const content = await dataStore.get("TrustList");
  console.log("content:", content);

  await dataStore.set("TrustList", {
    "did:key:edfdddsfqf23": {
      trust: false,
      comment: "what a scammer! beware!",
    },
  });
  const content2 = await dataStore.get("TrustList");
  console.log("content:", content2);
  console.log("did:key:edfdddsfqf23:", content2["did:key:edfdddsfqf23"]);
  process.exit();
};
main();
