import { CognitoIdentityCredentialProvider } from "@aws-sdk/credential-provider-cognito-identity";
import { CognitoUser } from ".";
import * as U from "../utils";

/**
 * Props Stored in the AuthContext - so far just a jwt and defaultCredentialProvider
 */
export interface AuthContextProps {
  jwt: string;
  user: CognitoUser;
  defaultCredentialProvider: CognitoIdentityCredentialProvider;
  graphql: U.GraphQLEvaluator;
  signOut: () => void;
}
