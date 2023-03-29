import * as t from "io-ts";

/* eslint-disable */
export const Token = t.type({
  id_token: t.string,
  access_token: t.string,
  refresh_token: t.string,
  expires_in: t.number,
  token_type: t.string,
});
/* eslint-enable */

/* eslint-disable */
export type TokenType = t.TypeOf<typeof Token>;
/* eslint-enable */
