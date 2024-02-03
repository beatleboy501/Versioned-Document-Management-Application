import React, { useCallback, useContext, useEffect, useState } from "react";
import AttachmentsTable from "./attachments/Table";
import { AllAttachmentsReturnType, AttachmentType } from "../types/Attachment";
import FileUploadButton from "./Button";
import { VersionType } from "../types/Version";
import { AuthContext } from "./Auth";
import { CreateAttachmentVariables, createAttachmentQuery } from "../queries/createAttachmentQuery";
import { createVersionQuery } from "../queries/createVersionQuery";
import Toast from "./Toast";
import { getAllAttachmentsQuery } from "../queries/getAllAttachmentsQuery";

function Main() {
    const ctx = useContext(AuthContext);
    const [attachments, setAttachments] = useState<AttachmentType[]>([]);
    const [toasts, setToasts] = useState<string[]>([]);
    const onCloseToast = useCallback((message: string) => setToasts(toasts.filter((t: string) => t !== message)), [toasts]);
    const onOpenToast = useCallback((message: string) => setToasts([...toasts, message]), [toasts]);
    const fetchAttachments = useCallback((newNextToken?: string) => {
        const onError = () => onOpenToast('Could not fetch attachments');
        const onSuccess = ({ allAttachments: { attachments: queryAttachments }, nextToken }: AllAttachmentsReturnType) => {
            if (queryAttachments) setAttachments((prevAttachments) => [...prevAttachments, ...queryAttachments]);
            if (nextToken) fetchAttachments(nextToken);
        };

        if (newNextToken) {
            ctx.graphql(getAllAttachmentsQuery({ limit: 10, nextToken: newNextToken }))(onError, onSuccess);
        } else {
            ctx.graphql(getAllAttachmentsQuery({ limit: 10 }))(onError, onSuccess);
        }
    }, [ctx, onOpenToast]);

    useEffect(() => {
        fetchAttachments();
    }, [fetchAttachments]);

    const createNewAttachmentInDynamo = (
        variables: CreateAttachmentVariables,
        onError: (e: Error) => void,
        onSuccess: (a: unknown) => void,
    ) => ctx.graphql(createAttachmentQuery(variables))(onError, onSuccess);

    const createNewVersionInDynamo = (
        variables: VersionType & { attachmentId: string },
        onError: (e: Error) => void,
        onSuccess: (a: unknown) => void,
    ) => ctx.graphql(createVersionQuery(variables))(onError, onSuccess);

    const createVersion = (originalAttachment: AttachmentType, fileName: string, newVersion: VersionType, existingAttachments: AttachmentType[]) => {
        const onError = (versionError: any) => {
            if (!originalAttachment) onOpenToast('Could not create a new version, original attachment not found');
            else onOpenToast(`Could not create a new version of attachment: ${fileName}. Error: ${versionError}`);
        };
        const onSuccess = () => {
            originalAttachment.versions?.push(newVersion);
            existingAttachments[existingAttachments.findIndex((a: AttachmentType) => a.id === originalAttachment.id)] = originalAttachment;
            setAttachments(existingAttachments);
        };
        createNewVersionInDynamo({ ...newVersion, attachmentId: originalAttachment.id }, onError, onSuccess);
    };

    const handleUpload = (url: string, versionId: string, fileName: string): void => {
        const newVersion: VersionType = {
            versionId,
            lastModified: new Date(Date.now()).toString(),
            url,
        };
        const updatedAttachments = attachments.slice();
        const match: AttachmentType | undefined = attachments.find(({ name }) => name === fileName);
        if (match) { // add to an existing doc's versions
            createVersion(match, fileName, newVersion, updatedAttachments);
        } else { // create a new doc
            const onError = (attachmentError: any) => {
                onOpenToast(`Could not save attachment: ${fileName}. Error: ${attachmentError}`);
            };
            const onSuccess = () => {
                updatedAttachments.push(attachment);
                createVersion(attachment, fileName, newVersion, updatedAttachments);
            };
            const attachment: AttachmentType = {
                id: versionId,
                name: fileName,
                type: fileName.split(".")[fileName.split(".").length - 1],
                versions: [],
                url,
                lastModified: new Date(Date.now()).toString(),
            };
            createNewAttachmentInDynamo(attachment, onError, onSuccess);
        }
    };

    return (
        <>
            <header>
                <h1>Versioned Document Management Application</h1>
            </header>
            {toasts.map((message) => <Toast message={message} onCloseToast={onCloseToast} />)}
            <main>
                <FileUploadButton onUpload={handleUpload} />
            </main>
            <footer>
                <AttachmentsTable attachments={attachments} />
            </footer>
        </>
    );
}

export default Main;
