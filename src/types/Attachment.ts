import * as t from 'io-ts';
import { Version } from './Version';

export const Attachment = t.type({
  id: t.string,
  name: t.string,
  type: t.string,
  url: t.string,
  versions: t.array(Version),
});

export type AttachmentType = t.TypeOf<typeof Attachment>;