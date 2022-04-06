import CeramicClient from "@ceramicnetwork/http-client";
import { ModelManager } from "@glazed/devtools";
import { model as basicProfileModel } from "@datamodels/identity-profile-basic";
import { Ed25519Provider } from "key-did-provider-ed25519";
import { getResolver } from "key-did-resolver";
import { DID } from "dids";

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

  const ceramic = new CeramicClient(API_URL);
  ceramic.did = newDid;

  const manager = new ModelManager(ceramic);
  manager.addJSONModel(basicProfileModel);

  const published = await manager.toPublished();
  console.log("published: ", published);

  const manager2 = new ModelManager(ceramic);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const schemaId = await manager2.createSchema("TrustOne", {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "TrustOne",
    type: "object",
    properties: {
      trust: {
        type: "string",
        maxLength: 255,
      },
    },
    required: ["trust"],
  });

  console.log("schemaID", schemaId);

  const schemaURI = manager2.getSchemaURL(schemaId);
  console.debug(`Wrote schema to "${schemaURI}".`);

  const definitionId = await manager2.createDefinition("trustOne", {
    name: "simple test",
    description: "record with one fiel (trust)",
    // @ts-ignore
    schema: schemaURI,
  });
  console.log("definitionId: ", definitionId);
  const encodedModel = manager2.toJSON();
  manager2.addJSONModel(encodedModel);
  const published2 = await manager2.toPublished();
  console.log("published2: ", published2);
};
main();
