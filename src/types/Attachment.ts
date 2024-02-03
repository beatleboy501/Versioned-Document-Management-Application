import * as t from 'io-ts';
import { Version } from './Version';

export const Attachment = t.type({
  id: t.string,
  name: t.string,
  type: t.string,
  url: t.string,
  versions: t.union([t.undefined, t.array(Version)]),
  lastModified: t.union([t.undefined, t.string]),
});

export const AllAttachments = t.type({
  attachments: t.union([t.undefined, t.array(Attachment)]),
});

export type AttachmentType = t.TypeOf<typeof Attachment>;

export type AllAttachmentsType = t.TypeOf<typeof AllAttachments>;

export type AllAttachmentsReturnType = { 
  allAttachments: AllAttachmentsType,
  nextToken?: string | null,
};