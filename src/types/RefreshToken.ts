import * as t from "io-ts";

export const RefreshToken = t.type({
  id_token: t.string,
  access_token: t.string,
  expires_in: t.number,
  token_type: t.string,
});

/* eslint-disable */
export type RefreshToken = t.TypeOf<typeof RefreshToken>;
/* eslint-enable */
