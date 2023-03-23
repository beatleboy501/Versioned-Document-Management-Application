import { AwsCredentialIdentity } from '@aws-sdk/types';
import { parseUrl } from '@aws-sdk/url-parser';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { Sha256 as sha256 } from '@aws-crypto/sha256-browser';
import { S3RequestPresigner } from '@aws-sdk/s3-request-presigner';
import { formatUrl } from '@aws-sdk/util-format-url';

export interface GenerateSignedUrlProps {
  region: string;
  url: string;
  credentials: AwsCredentialIdentity;
}

const generateSignedUrl = async ({ credentials, region, url }: GenerateSignedUrlProps) => {
  const s3ObjectUrl = parseUrl(url);
  const presigner = new S3RequestPresigner({
    credentials,
    region,
    sha256,
  });
  const presigned = await presigner.presign(new HttpRequest(s3ObjectUrl));
  return formatUrl(presigned);
};

export default generateSignedUrl;
