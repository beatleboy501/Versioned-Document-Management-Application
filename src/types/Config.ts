import * as t from "io-ts";

/**
 * io-ts Codec describing various parameters we'll need to configure our app.
 * Not really sure where to put it yet, though this isn't a great place
 */
export const Config = t.type({
  accountId: t.string,
  clientId: t.string,
  region: t.string,
  userPoolId: t.string,
  identityPoolId: t.string,
  redirectUri: t.string,
  apiEndpoint: t.string,
  authDomain: t.string,
});

/**
 * Type derives from the Config io-ts Codec
 */
export type ConfigType = t.TypeOf<typeof Config>;