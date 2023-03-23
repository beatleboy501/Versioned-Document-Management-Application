import { AttachmentType } from "./Attachment";

interface AttachmentsLinkProps {
    attachments: AttachmentType[];
}

interface ExpandableProps {
    row: AttachmentType,
    version: {
        versionId: string,
        lastModified: string | undefined | null,
    }
}

interface RowProps { row: AttachmentType }

export type {
    AttachmentsLinkProps,
    ExpandableProps,
    RowProps,
};
