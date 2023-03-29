import * as t from "io-ts";
import { Token } from "./Token";
import { CognitoUser } from ".";

export const AuthItems = t.type({
  token: Token,
  user: CognitoUser,
});

/* eslint-disable */
export type AuthItems = t.TypeOf<typeof AuthItems>;
/* eslint-enable */
