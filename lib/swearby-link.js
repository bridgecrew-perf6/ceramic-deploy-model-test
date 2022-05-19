import { CeramicClient } from "@ceramicnetwork/http-client";
import { getResolver as get3IDResolver } from "@ceramicnetwork/3id-did-resolver";
import { Ed25519Provider } from "key-did-provider-ed25519";
import { getResolver as getKeyResolver, getResolver } from "key-did-resolver";
import { DID } from "dids";
import { TextEncoder } from "util";
import { ThreeIdProvider } from "@3id/did-provider";
async function authenticateDID(seed) {
    const provider = new Ed25519Provider(seed);
    const did = new DID({ provider, resolver: getResolver() });
    await did.authenticate();
    return did;
}
const API_URL = "https://ceramic-clay.3boxlabs.com";
export async function authenticateWithSecret(authSecret) {
    const ceramic = new CeramicClient(API_URL);
    const threeID = await ThreeIdProvider.create({
        authId: "myAuthID",
        authSecret,
        getPermission: (request) => Promise.resolve(request.payload.paths),
        ceramic: ceramic,
    });
    const did = new DID({
        provider: threeID.getDidProvider(),
        resolver: {
            ...get3IDResolver(ceramic),
            ...getKeyResolver(),
        },
    });
    await did.authenticate();
    ceramic.did = did;
    return did;
}
const main = async () => {
    const encoder = new TextEncoder();
    const seed = encoder.encode(process.env.SEED);
    const newDid = await authenticateWithSecret(seed);
    console.log("did used to deploy model:", newDid.id);
    const ceramic = new CeramicClient(API_URL);
    ceramic.did = newDid;
};
main();
//# sourceMappingURL=swearby-link.js.map