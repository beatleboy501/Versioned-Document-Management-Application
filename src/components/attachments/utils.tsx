import { AttachmentType } from "../../types/Attachment";
import Row from "./Row";

export const mapToRow = (attachments: AttachmentType[]) => (attachments.map(a => <Row key={a.name} row={a} />));
