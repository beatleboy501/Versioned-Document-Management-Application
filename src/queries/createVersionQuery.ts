import * as t from 'io-ts';
import { Query, makeQuery } from ".";
import { Version } from '../types/Version';

/** *************************************************************************
* CreateVersionQuery
************************************************************************** */
export const CreateVersionQuery = t.type({
  createAttachmentVersion: t.intersection([
    Version,
    t.type({
      attachmentId: t.union([t.string, t.undefined, t.null]),
    }),
  ]),
});

export type CreateVersionQueryType = t.TypeOf<typeof CreateVersionQuery>
export type CreateVersionVariables = {
  versionId: string,
  lastModified?: string | null,
  url?: string | null;
  attachmentId?: string | null,
}

export const createVersionQuery: Query<
  CreateVersionQueryType,
  CreateVersionVariables
> = makeQuery({
  codec: CreateVersionQuery,
  operationName: 'CreateAttachmentVersion',
  query: `
    mutation CreateAttachmentVersion(
      $versionId: ID!,
      $attachmentId: String,
      $lastModified: String,
      $url: String,
    ){
      createAttachmentVersion(
        versionId: $versionId,
        attachmentId: $attachmentId,
        url: $url,
        lastModified: $lastModified
      ){ 
      versionId,
      lastModified,
      url,
      attachmentId
     }
    }`,
});
