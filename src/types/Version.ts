import * as t from 'io-ts';

export const Version = t.type({
  versionId: t.string,
  lastModified: t.union([t.string, t.undefined, t.null]),
  url: t.union([t.string, t.undefined, t.null]),
});

export type VersionType = t.TypeOf<typeof Version>;