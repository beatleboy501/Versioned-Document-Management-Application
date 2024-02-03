import * as t from 'io-ts';
import { makeQuery, Query } from '.';
import { Attachment } from '../types/Attachment';

const attachmentFragment = `
  fragment attachmentFragment on Attachment {
    id,
    name,
    type,
    url
  }
`;

/** *************************************************************************
* CreateAttachmentQuery
************************************************************************** */
export const CreateAttachmentQuery = t.type({
  createAttachment: Attachment,
});

export type CreateAttachmentQueryType = t.TypeOf<typeof CreateAttachmentQuery>
export type CreateAttachmentVariables = {
  id: string;
  name: string;
  type: string;
  url: string;
  lastModified?: string;
}

export const createAttachmentQuery: Query<
  CreateAttachmentQueryType,
  CreateAttachmentVariables
> = makeQuery({
  codec: CreateAttachmentQuery,
  operationName: 'CreateAttachment',
  query: `
    ${attachmentFragment}
    mutation CreateAttachment(
      $id: ID!,
      $name: String,
      $type: String,
      $url: String,
      $lastModified: String
    ){
      createAttachment(
        id: $id,
        name: $name,
        type: $type,
        url: $url,
        lastModified: $lastModified,
    ){ ...attachmentFragment } }`,
});
