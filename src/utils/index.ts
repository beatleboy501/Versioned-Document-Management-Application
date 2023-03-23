import * as t from 'io-ts';
import * as PathReporter from 'io-ts/lib/PathReporter';
import * as E from 'fp-ts/Either';
import { Config } from '../components/Auth';

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

export const graphql = (config: Config) => (jwt: string) => <A, V>(props: GraphQLProps<A, V>) => (
  onError: (e: Error) => void,
  onSuccess: (a: A) => void,
): void => {
  const method = 'POST';
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${jwt}`,
  };
  const {
    codec, variables, query, operationName,
  } = props;
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

const states: { [key:string]: string} = {
  alabama: 'al',
  alaska: 'ak',
  arizona: 'az',
  arkansas: 'ar',
  california: 'ca',
  colorado: 'co',
  connecticut: 'ct',
  delaware: 'de',
  florida: 'fl',
  georgia: 'ga',
  hawaii: 'hi',
  idaho: 'id',
  illinois: 'il',
  indiana: 'in',
  iowa: 'ia',
  kansas: 'ks',
  kentucky: 'ky',
  louisiana: 'la',
  maine: 'me',
  maryland: 'md',
  massachusetts: 'ma',
  michigan: 'mi',
  minnesota: 'mn',
  mississippi: 'ms',
  missouri: 'mo',
  montana: 'mt',
  nebraska: 'ne',
  nevada: 'nv',
  'new hampshire': 'nh',
  'new jersey': 'nj',
  'new mexico': 'nm',
  'new york': 'ny',
  'north carolina': 'nc',
  'north dakota': 'nd',
  ohio: 'oh',
  oklahoma: 'ok',
  oregon: 'or',
  pennsylvania: 'pa',
  'rhode island': 'ri',
  'south carolina': 'sc',
  'south dakota': 'sd',
  tennessee: 'tn',
  texas: 'tx',
  utah: 'ut',
  vermont: 'vt',
  virginia: 'va',
  washington: 'wa',
  'west virginia': 'wv',
  wisconsin: 'wi',
  wyoming: 'wy',
};

export const stateAbbreviation = (
  fullState: string,
): string => states[fullState.toLowerCase()] || fullState;

export const lowerCaseFirstChar = (str: string) => str.charAt(0).toLowerCase() + str.substring(1);
