import { AwsCredentialIdentity } from '@aws-sdk/types';
import mime from 'mime';
import {
  S3Client, S3ClientConfig, PutObjectCommand, PutObjectCommandInput, PutObjectCommandOutput,
} from '@aws-sdk/client-s3';

export interface UploadToS3Props {
  fileUploadData: string;
  filename: string;
  bucket: string;
  region: string;
  credentials: AwsCredentialIdentity;
}

const uploadToS3 = async ({ bucket, filename, credentials, fileUploadData, region }: UploadToS3Props) => {
  const contentType: string | null = mime.getType(filename);
  if (!contentType) throw Error(`Filename invalid: ${filename}`);
  const binary: string = atob(fileUploadData.split(',')[1]);
  const array: number[] = [];
  for (let i = 0; i < binary.length; i++) array.push(binary.charCodeAt(i));
  const body: Blob = new Blob([new Uint8Array(array)], { type: contentType });
  const s3Configuration: S3ClientConfig = { credentials, region };
  const s3: S3Client = new S3Client(s3Configuration);
  const putParams: PutObjectCommandInput = {
    Bucket: bucket,
    Key: `${encodeURIComponent(filename)}`,
    Expires: new Date(Date.now() + 30 * 60),
    ContentType: contentType,
    Body: body,
  };
  if (contentType === 'application/pdf') putParams.ContentEncoding = 'base64';
  const putCommand: PutObjectCommand = new PutObjectCommand(putParams);
  const result: PutObjectCommandOutput = await s3.send<PutObjectCommandInput, PutObjectCommandOutput>(putCommand);
  return result;
};

export default uploadToS3;
