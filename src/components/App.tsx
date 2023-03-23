import React, { useState } from "react";
import AttachmentsTable from "./attachments/Table";
import { AttachmentType } from "../types/Attachment";
import FileUploadButton from "./Button";
import cognitoConfig from "../cognito-config.json";
import { VersionType } from "../types/Version";
import Auth from "./Auth";
import "../styles/App.css";

function App() {
  const defaultVer: VersionType = {
    versionId: "RI7TJ1tsxrw1K9FroQLslxhtgwC8fGcU",
    lastModified: "3/23/2023, 5:50:23 PM",
    url: "https://docmgmt-rdocumentmanagementbucket-qxnisw4vx8sk.s3.amazonaws.com/CLOUD%252520COMPARISONS.jpg?versionId=RI7TJ1tsxrw1K9FroQLslxhtgwC8fGcU"
  };
  const defaultAtt: AttachmentType = {
    id: "RI7TJ1tsxrw1K9FroQLslxhtgwC8fGcU",
    name: "CLOUD COMPARISONS.jpg",
    type: "jpg",
    url: "https://docmgmt-rdocumentmanagementbucket-qxnisw4vx8sk.s3.amazonaws.com/CLOUD%252520COMPARISONS.jpg?versionId=RI7TJ1tsxrw1K9FroQLslxhtgwC8fGcU",
    versions: [defaultVer],
  };
  const [attachments, setAttachments] = useState<AttachmentType[]>([defaultAtt]);
  
  const handleUpload = (url: string, versionId: string, fileName: string): void => {
    const newVersion: VersionType = { versionId, lastModified: new Date(Date.now()).toString(), url };
    const newAttachments = attachments.slice();
    const match: AttachmentType | undefined = attachments.find(({ name }) => name === fileName);
    if (match) { // add to an existing doc's versions
      match.versions.push(newVersion);
      newAttachments[newAttachments.findIndex((a: AttachmentType) => a.id === match.id)] = match;
    } else { // create a new doc
      const newAttachment: AttachmentType = {
        id: versionId,
        name: fileName,
        type: fileName.split(".")[fileName.split(".").length - 1],
        url,
        versions: [newVersion],
      };
      newAttachments.push(newAttachment);
    }
    setAttachments(newAttachments);
  };

  return (
    <Auth config={cognitoConfig}>
      <header>
        <h1>Versioned Document Management Application</h1>
      </header>
      <main>
        <FileUploadButton onUpload={handleUpload} />
      </main>
      <footer>
        <AttachmentsTable attachments={attachments} />
      </footer>
    </Auth>
  );
}

export default App;
