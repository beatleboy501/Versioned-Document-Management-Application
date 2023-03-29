import React, { useEffect, useState } from 'react';
import { CognitoIdentityCredentialProvider, fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { Buffer } from 'buffer';
import * as E from 'fp-ts/Either';
import * as U from '../utils';
import { CognitoUser } from '../types';
import { AuthContextProps } from '../types/AuthContextProps';
import { ConfigType } from '../types/Config';
import { Token, TokenType } from '../types/Token';
import { AuthItems } from '../types/AuthItems';
import { RefreshToken } from '../types/RefreshToken';
import { AuthProps } from '../types/AuthProps';

// @ts-ignore
window.Buffer = Buffer;

/**
 * Context to store the above props for later use
 */
export const AuthContext = React.createContext<AuthContextProps>(undefined!);

// puts together the domain name for cognito
const cognitoAuthDomain = (config: ConfigType): string => `${config.authDomain}.auth.${config.region}.amazoncognito.com`;

// creates an AWS Credential provider from the given information.
const credentialProvider = ({
  accountId,
  region,
  identityPoolId,
  userPoolId,
}: ConfigType) => (jwt: string) => {
  const client = new CognitoIdentityClient({
    region,
    credentials: () => Promise.resolve({} as any), // Temporary fix 
  });
  const cognitoUrl = `cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  const logins: { [key: string]: string } = {};
  logins[cognitoUrl] = jwt;
  const provider: CognitoIdentityCredentialProvider = fromCognitoIdentityPool({
    accountId,
    client,
    identityPoolId,
    logins,
  });
  return provider;
};

// converts the Cognito token into a CognitoUser be decoding the id_token
const tokenToUser = ({ id_token }: TokenType): E.Either<Error, CognitoUser> => {
  try {
    const tokens = id_token.split('.');
    if (tokens[1]) {
      const json = JSON.parse(
        Buffer.from(tokens[1], 'base64').toString('utf8'),
      );
      const either = CognitoUser.decode(json);
      if (either._tag === 'Left') {
        // this is the case where the user comes from AWS Federate
        if (json && json.identities && json.identities[0] && json.identities[0].userId) {
          const [{ userId }] = json.identities;
          const email = `${userId}@amazon.com`;
          const user: CognitoUser = { email, isAdmin: undefined, name: json.name };
          return E.right(user);
        }
      }
      return E.mapLeft(U.errorsToError)(either);
    }
    return E.left(new Error("The token couldn't be decoded"));
  } catch (e: any) {
    return E.left(new Error(e.message));
  }
};

const getCookie = (name: string) => document.cookie.split(';').some(c => c.trim().startsWith(name + '='));

const deleteCookie = (name: string, path: string, domain: string) => {
  if(getCookie(name)) {
    document.cookie = name + "=" +
      ((path) ? ";path="+path:"")+
      ((domain)?";domain="+domain:"") +
      ";expires=Thu, 01 Jan 1970 00:00:01 GMT";
  }
};

const signOut = (config: ConfigType) => () => {
  localStorage.removeItem('auth');
  sessionStorage.removeItem('auth');
  deleteCookie('cognito', '/', window.location.host);
  deleteCookie('token', '/', window.location.host);
  redirect(signInUrl(config))(0);
};

const redirectUri = (config: ConfigType): string => (window.location.host.match(/^localhost/)
  ? config.redirectUri
  : `https://${window.location.host}`);

// refreshes the given token and sticks the result into session storage.
// This will also trigger a refersh in 55 minutes since tokens expire after 60
const refreshToken = (config: ConfigType) => (
  setAuthContext: (props: AuthContextProps) => void,
) => (token: TokenType): void => {
  const url = `https://${cognitoAuthDomain(config)}/oauth2/token`;
  const body = `grant_type=refresh_token&client_id=${config.clientId
    }&refresh_token=${token.refresh_token}&redirect_uri=${redirectUri(config)}`;
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  const refreshTokenToToken = ({
    id_token, // eslint-disable-line camelcase
    access_token, // eslint-disable-line camelcase
    expires_in, // eslint-disable-line camelcase
  }: RefreshToken): TokenType => ({
    refresh_token: token.refresh_token,
    token_type: token.token_type,
    id_token,
    access_token,
    expires_in,
  });
  fetch(url, { method: 'POST', body, headers })
    .then((response) => response.json())
    .then(RefreshToken.decode)
    .then(E.mapLeft(U.errorsToError))
    .then(U.liftError)
    .then(refreshTokenToToken)
    .then((newToken) => U.liftError(tokenToUser(token)).then((user) => ({
      token: newToken,
      user,
    })))
    .then(({ token: newToken, user }) => {
      const jwt = newToken.id_token;
      const defaultCredentialProvider: CognitoIdentityCredentialProvider = credentialProvider(config)(jwt);
      const graphql = U.graphql(config)(jwt);
      setAuthContext({
        jwt, defaultCredentialProvider, graphql, user, signOut: signOut(config),
      });
      const fiftyFiveMinutes = 1000 * 60 * 55;
      setTimeout(
        () => refreshToken(config)(setAuthContext)(newToken),
        fiftyFiveMinutes,
      );
    })
    .catch((e: Error) => {
      sessionStorage?.removeItem('auth'); // eslint-disable-line no-unused-expressions
      window.location.reload();
      throw e;
    });
};

// part of the OAuth process - give a 'code' this function will ask Cognito for a token
const getToken = (config: ConfigType) => (code: string): Promise<AuthItems> => {
  const url = `https://${cognitoAuthDomain(config)}/oauth2/token`;
  const body = `grant_type=authorization_code&client_id=${config.clientId
    }&code=${code}&redirect_uri=${redirectUri(config)}`;
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  return fetch(url, { method: 'POST', body, headers })
    .then((response) => response.json())
    .then(Token.decode)
    .then(E.mapLeft(U.errorsToError))
    .then(U.liftError)
    .then((token) => U.liftError(tokenToUser(token)).then((user) => ({ token, user })));
};

// puts together the URL to sign into Cognito
const signInUrl = (config: ConfigType): string => `https://${cognitoAuthDomain(config)}/login?client_id=${config.clientId
  }&response_type=code&scope=openid+profile&redirect_uri=${redirectUri(
    config,
  )}`;

// simple function to redirect to a given URL
const redirect = (url: string) => (timeout: number): void => {
  setTimeout(() => {
    window.location.href = url;
  }, timeout);
};

/**
 * A component that handles authentication with Cognito.
 *
 * It redirects to the Cognito login page unless there is a JWT token in the URL.
 * In that case it stores it in an `AuthContext` along with a `AwsCredentialIdentity`
 * so they can later be used for various purposes
 *
 * @param props just the config object with various Cognito values/settings
 */
const Auth: React.FunctionComponent<AuthProps> = ({ config, children }: AuthProps) => {
  const [authContextProps, setAuthContextProps] = useState<AuthContextProps | undefined>(undefined);

  // if the jwt token is in the url or sessionStorage, set the state
  useEffect(() => {
    const url = new URL(document.location.href);
    const code = url.searchParams.get('code');
    if (code) {
      getToken(config)(code).then((auth) => {
        sessionStorage?.setItem('auth', JSON.stringify(auth));
        const { user, token } = auth;
        const jwt = token.id_token;
        if (jwt) {
          const defaultCredentialProvider = credentialProvider(config)(jwt);
          const graphql = U.graphql(config)(jwt);
          setAuthContextProps({
            jwt, defaultCredentialProvider, graphql, user, signOut: signOut(config),
          });
        } else {
          // eslint-disable-next-line no-console
          console.error(
            'Something went wrong getting the JWT token from the URL',
          );
          redirect(signInUrl(config))(0);
        }
      });
    } else if (authContextProps === undefined) {
      const auth = sessionStorage?.getItem('auth');
      if (auth) {
        const json = JSON.parse(auth);
        const either = AuthItems.decode(json);
        if (E.isRight(either)) {
          refreshToken(config)(setAuthContextProps)(either.right.token);
        } else {
          redirect(signInUrl(config))(0);
        }
      } else {
        redirect(signInUrl(config))(0);
      }
    }
    // disabling linting here, because I really only want this called once
    // eslint-disable-next-line
  }, []);

  // remove the token from the URL once it's been set in the state
  useEffect(() => {
    const url = new URL(document.location.href);
    if (authContextProps && url.searchParams.get('code')) {
      url.searchParams.delete('code');
      window.history.pushState('', document.title, url.toString());
    }
  }, [authContextProps]);

  if (authContextProps) {
    return (
      <AuthContext.Provider value={authContextProps}>
        {children}
      </AuthContext.Provider>
    );
  }
  return null;
};

export default Auth;
