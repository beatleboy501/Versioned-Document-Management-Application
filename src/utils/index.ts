import * as t from 'io-ts';
import * as PathReporter from 'io-ts/lib/PathReporter';
import * as E from 'fp-ts/Either';
import { ConfigType } from '../types/Config';

export const liftError = <A>(either: E.Either<Error, A>): Promise<A> => {
  const onError = (e: Error): Promise<A> => Promise.reject(e);
  return E.fold(onError, (a: A) => Promise.resolve(a))(either);
};

export const errorsToError = (errors: t.Errors): Error => new Error(PathReporter.failure(errors).join('\n'));

export type GraphQLProps<A, V> = {
  codec: t.Type<A, A, unknown>,
  query: string;
  operationName?: string;
  variables?: V
};

const QueryResultCodec = <A>(codec: t.Type<A, A, unknown>) => t.type({
  data: codec,
});

export type GraphQLEvaluator = <A, V>(props: GraphQLProps<A, V>) => (
    onError: (e: Error) => void,
    onSuccess: (a: A) => void,
  ) => void

export const graphql = (config: ConfigType) => (jwt: string) => <A, V>(
  { codec, variables, query, operationName }: GraphQLProps<A, V>
) => (
  onError: (e: Error) => void,
  onSuccess: (a: A) => void,
): void => {
    const method = 'POST';
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    };
    const body = JSON.stringify({ variables, query, operationName });
    const queryResultCodec = QueryResultCodec(codec);
    const onGQLSuccess = ({ data }: { data: A }) => onSuccess(data);
    fetch(config.apiEndpoint, { method, headers, body })
      .then((response) => response.json())
      .then(queryResultCodec.decode)
      .then(E.mapLeft(errorsToError))
      .then(E.fold(onError, onGQLSuccess))
      .catch(onError);
  };
