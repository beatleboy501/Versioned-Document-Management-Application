import * as t from 'io-ts';

export const Upload = t.type({
  url: t.string,
  versionId: t.string,
  fileName: t.string,
});

export type UploadType = t.TypeOf<typeof Upload>


