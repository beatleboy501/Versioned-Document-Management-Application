import * as t from 'io-ts';
import { GraphQLProps } from '../utils';

export const CognitoUser = t.type({
  email: t.string,
  isAdmin: t.union([t.boolean, t.undefined]),
  name: t.union([t.undefined, t.string]),
});

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type CognitoUser = t.TypeOf<typeof CognitoUser>;

export type Query<A, V> = (variables?: V) => GraphQLProps<A,V>

export const makeQuery = <A,V>(props: Omit<GraphQLProps<A,V>, "variables">) => (variables?: V): GraphQLProps<A,V> => ({
  variables,
  ...props
});
