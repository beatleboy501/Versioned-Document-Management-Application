import * as t from 'io-ts';
import { makeQuery, Query } from '.';
import { AllAttachments } from '../types/Attachment';

/** *************************************************************************
* GetAllAttachmentsQuery
************************************************************************** */
export const GetAllAttachmentsQuery = t.type({
    allAttachments: AllAttachments,
});

export type GetAllAttachmentsQueryType = t.TypeOf<typeof GetAllAttachmentsQuery>
export type GetAllAttachmentsVariables = {
  limit: number;
  nextToken?: string;
}

export const getAllAttachmentsQuery: Query<
  GetAllAttachmentsQueryType,
  GetAllAttachmentsVariables
> = makeQuery({
  codec: GetAllAttachmentsQuery,
  operationName: 'GetAllAttachments',
  query: `
    query GetAllAttachments(
        $limit: Int,
        $nextToken: String
    ) {
        allAttachments(limit: $limit, nextToken: $nextToken) {
          attachments {
            url
            name
            id
            type
          }
          nextToken
        }
      }`,
});
