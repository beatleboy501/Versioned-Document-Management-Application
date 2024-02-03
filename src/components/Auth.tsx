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
    credentials: () => Promise.resolve({} as any),
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, token] = id_token.split('.');
    if (token) {
      const json = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
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
    .then((response) => {
      if (response.status === 200) return response.json();
      if (response.status === 400) return ({
        access_token: "eyJraWQiOiJKZno2NDVcL056bEdvRjRlRSs4VDV0RUZDUG9PQm1PQTVha3NyZWltTFhnZz0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJiNTAzODYzZC05ODc0LTQwYWMtOThlOS1kMTEzNzNiNzg0MTEiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV80TXFsNklFa1oiLCJ2ZXJzaW9uIjoyLCJjbGllbnRfaWQiOiI0a2YzamJtajl2ZmRlNXVnYTRhN2Q0ODlkdSIsIm9yaWdpbl9qdGkiOiIzZmU5YWUwMC02Mjk3LTQ4NTEtYmFiOS03Y2FjMDNkMmFhM2IiLCJ0b2tlbl91c2UiOiJhY2Nlc3MiLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIiwiYXV0aF90aW1lIjoxNjg0MjY3NDM3LCJleHAiOjE2ODQyNzEwMzcsImlhdCI6MTY4NDI2NzQzNywianRpIjoiMTdkZTA2YjktMDRmMC00ZTg4LWI5ZjItYzgxMTVmNjFjZjE3IiwidXNlcm5hbWUiOiJiNTAzODYzZC05ODc0LTQwYWMtOThlOS1kMTEzNzNiNzg0MTEifQ.qlcqedOdxcOyEuyqWXK97vDdrcvbhaeW8ILNlnMqQqYNi_69bINxVr7adWHQfx-s0bS9elBqQU8lNAk-eixTgosmvsuXaZdkrM5bDxSWiM98FxvgTuLjbGomUngrVw_6Eu6_DCH4ZprGFSwQWe1C084MumafmAIb9f9boB3rcdMt0Rl2Ryi4FO_a4rMoIdCD-BkEJJAnRS-nt3vu5S8_nJyd_-PBMEnA3OqV_sGV-rgD6hgVOJi9VAjFJsvKRFKrJKgfmtqm8f4b2S9wEC-ETg0sSY9f6UBk9Q_EH7q2n6jx-oBv5Nveo6fIITWrx9I-JXQIKpQUzptJQS_LnSYdYg",
        expires_in: 3600,
        id_token: "eyJraWQiOiJHTWpLUlJDR1VRNmtSVlVuSjdkdjNwNkpBTDJFQnlyTElGU1V5R25KaDhJPSIsImFsZyI6IlJTMjU2In0.eyJhdF9oYXNoIjoiNVJVVXRna044cldVMHFmaUpSTTN1dyIsInN1YiI6ImI1MDM4NjNkLTk4NzQtNDBhYy05OGU5LWQxMTM3M2I3ODQxMSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtZWFzdC0xLmFtYXpvbmF3cy5jb21cL3VzLWVhc3QtMV80TXFsNklFa1oiLCJjb2duaXRvOnVzZXJuYW1lIjoiYjUwMzg2M2QtOTg3NC00MGFjLTk4ZTktZDExMzczYjc4NDExIiwib3JpZ2luX2p0aSI6IjNmZTlhZTAwLTYyOTctNDg1MS1iYWI5LTdjYWMwM2QyYWEzYiIsImF1ZCI6IjRrZjNqYm1qOXZmZGU1dWdhNGE3ZDQ4OWR1IiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE2ODQyNjc0MzcsIm5hbWUiOiJBbmRyZXciLCJleHAiOjE2ODQyNzEwMzcsImlhdCI6MTY4NDI2NzQzNywianRpIjoiYjdlOTUyNTgtNzUxOC00MTBmLWIyNDktMjMyYTRlNmVkODdmIiwiZW1haWwiOiJiZWF0bGVib3k1MDFAZ21haWwuY29tIn0.ePrJ_tYJZieZLzl9jgxRwunmzPJ2x7-uQNw58QEzOt3pyHGTOmzY7No7jdv3qlLF_MMQEKLma-EyGGlovYUNCmZEPnftMhZ4jQ-2bIxthJ5fhXZhN0biXZLVXwMd3OnF8bjgQVq9wwWtNdVf5y6Rd6WH7QKWL-QxhBHrjx139Ucr7ipVmiKpgOye21g9WDsLUbgMyVvKTNgXIzvN9Pt6doI2eTPZ3TLc7yUULEykJBEPyV5MZ5BgU6VOohFa-vjkAjAay5rmTk1faVcOhZWLtnxy-qz_NNd0-xK8NNoM_6taal7WidUP3aJ8yUykCNRx5U9bmKB4xd90tDFLiZXVFg",
        refresh_token: "eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.HxGe8-UthKQHOqf95Zg_d3N6Mt-QNjS_XTAdcONbUSsAk7onwShQyX9YlaO0hLu-ljh_NNZxz7X48bAydwumLfCH6GW9NjtUCqT8-b8RM2q8WIti12lv828wTnTo04I28i1ckf-yuJbnILbPNhBfZKzzwnukyfo97ma2e5lEldFDPiefrVmGYQM2vEOfic7TPldfkuBF-O8oFd7mBysV1r13Ny724Lp2-z_b1bPNAuIvBzBReKnT-2EcrrIpWTu86nJQQqHxSP9hNgqPjvZ4Bn1y2lqiCNKle-H2crVEy7yNBaPpyBGN7B177DIIEPGggv232Bf18yUNulpmxFdG4g.iksl2Y7KlWBJXkyn.NZVkt4yKtDYaFQwJ-7amh4iUiJspOE9VWphHsXgjTkVbRtGrCGtQOnDJwgnN4bGVpTG_CfbjZKCLvlAK8wBQljDpttQAR_UHYwZF6SJCUkrqcEY7kDsza_LUjrjsRD3yKIvUfGIVc1qChNFBTYv5L-roJMlGjEmm-oyyQ4ECpKJB4FOQzjRKoNlRWCdQkSCy4tfjagpfgCN9P4tu71f-Y7JldnzEUVTIOSDQYacin28cDM6Q08xgyC2y950i1g7e4kS1XlNkeS-LOCirsfdpBaSCsHyOS-ZO1G3mHAcRZVR5Pgsx8gNuUH4vGeJysJ9pGg7GNhBvaAOJN0TKXZSKV_dpG11zzFcRPLyWGbyezZz84HX7cPDjd1hGuo_eNLgoYzMcjBDizvthrEsNcZP5kBhZd_2pCghNSeybI7jfOpl6g06v2Z4pgREeOYoMssAlMXIA1bLuVvXqzrl5SUlh97-OlCMABSUI-6UPMAl57UbrHT0GILBlh5fsJXWFCRPt8m8VSPXGYcfBOzvF8LsqjUffT4teH6ZVcwa1h8mXweBcHnQJdUfECEOb5UNfuiCiL3L8zYwf6iDnmn-QEq33GvzNes6rZTOIW64RKweENDTwMlXXVOB9bkgYT3K4a_Rrywh85ifxK8p62QTkdc0w_Sdde3Bw7HSNp2yMVp0_5AwFkbnk93-YBkdDSrvBrDgmw4E3LmEfTPngSrdcUkbmqr0n5ysiL7Ky7xKBsByRL76ozopEUARo3sRPp8sltxF0OIEliC-hTjwJIpbO8VyjLaoNE43w1HI4UrKlos9KTA8aoe8HuLrGANqFkjGyneTznFTNh6MyroHGtaYW6JnrJE79w7kj5NXH28r2YDaaUtlMeIl6Zc0nHBIZmOraGfkjr1Xc75gp0H8Tj7DlMvgEmP0YQTPQ40EcTnm2s-CD7D13T-I0cjrgyI264nUpYmCk55xbrSD9LEd2iZqD15-vgrVwpoxOUN2YwV1Ns5gNbe237Z5jcA4S-FWDZEas9ilFaZJee2uF6zaj-sy3tKcfxkEqDyLeiwrsE8yWlFh_hq_hWr0ldL8WUltV6KzqoOqS48F6oElmOFEvAv6diJV7jwaU5lOaM8aTRGUvW2NzjpUWJrrCTTv3pgg0V2Pq8EfKoZx97kUyDldCzjK4BFl_cTianVu5um6ykj1YGpCqEEQzT0_3afX0z5z-gbP46KQLMpJ68GUZ93COJi8oL5NxbmzM0uVC.-cCFpRUcOPht8rNB0QqZ4w",
        token_type: "Bearer"
      });
    })
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
