import React, { ChangeEvent, useEffect, useState, useContext } from 'react';
import { makeStyles, IconButton, Tooltip } from '@material-ui/core';
import CloudUpload from '@mui/icons-material/CloudUpload';
import uploadToS3 from '../uploadToS3';
import config from '../s3-config.json';
import { AuthContext } from './Auth';

interface ButtonProps {
  onUpload: (url: string, versionId: string, fileName: string) => void,
}

const useStyles = makeStyles((theme: { spacing: (arg0: number) => any; }) => ({
  iconButtons: {
    float: 'right',
  },
  iconButton: {
    borderRadius: theme.spacing(0.5),
    marginLeft: theme.spacing(1),
    minHeight: 32,
    minWidth: 32,
  },
  infoItems: {
    paddingBottom: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
  },
  fileUploadButton: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    cursor: 'pointer',
  },
  hiddenInput: {
    display: 'none',
  },
  cloudUpload: { minHeight: 32, minWidth: 32 },
}));

const getBaseS3Url = (filename: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { documentAttachmentBucketName, region } = config;
  return `https://${documentAttachmentBucketName}.s3.amazonaws.com/${filename}`;
};

const FileUploadButton = ({ onUpload }: ButtonProps) => {
  const classes = useStyles();
  const ctx = useContext(AuthContext);
  const [file, setFile] = useState<File | undefined>();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (!files || !files.length) return;
    setFile(files[0] as File);
  };

  useEffect(() => {
    (async () => {
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e: ProgressEvent<FileReader>) => {
          if (e.target?.result && typeof e.target?.result === 'string') {
            const fileUploadData: string = e.target?.result;
            await ctx.defaultCredentialProvider()
              .then(async (credentials) => {
                const filename = encodeURIComponent(file.name);
                const { result, key } = await uploadToS3({
                  bucket: config.documentAttachmentBucketName,
                  region: config.region,
                  fileUploadData,
                  filename,
                  credentials,
                  prefix: credentials.identityId,
                });
                const versionId = result.VersionId;
                const url = getBaseS3Url(key.split('/').map(encodeURIComponent).join('/'));
                if (versionId) {
                  onUpload(url, versionId, file.name);
                  setFile(undefined);
                }
              });
          // eslint-disable-next-line no-console
          } else {
            console.error(`FileReader error: e.target = ${e.target}`);
            setFile(undefined);
          }
        };
        reader.readAsDataURL(file);
      }
    })();
  }, [ctx, file, onUpload]);

  return (
    <Tooltip title="Upload Document">
      <IconButton
        size="medium"
        className={classes.iconButton}
      >
        <label htmlFor="file-upload" className={classes.fileUploadButton}>
          <CloudUpload color="primary" className={classes.cloudUpload} />
        </label>
        <input type="file" onChange={handleChange} id="file-upload" className={classes.hiddenInput} />
      </IconButton>
    </Tooltip>
  );
};

export default React.memo(FileUploadButton);
