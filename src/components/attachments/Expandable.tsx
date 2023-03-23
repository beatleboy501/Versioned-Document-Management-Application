import React, { useContext, useEffect, useState } from 'react';
import { Link, TableCell, TableRow, Typography } from '@material-ui/core';
import generateSignedUrl from '../../generateSignedUrl';
import { AuthContext, AuthContextProps } from '../Auth';
import { ExpandableProps } from '../../types/Props';
import config from '../../s3-config.json';

const Expandable = ({ row, version }: ExpandableProps) => {
  const ctx = useContext<AuthContextProps>(AuthContext);
  const [versionUrl, setVersionUrl] = useState(`${row.url}?versionId=${version.versionId}`);

  useEffect(() => {
    (async () => {
      await ctx.defaultCredentialProvider()
        .then(async (credentials) => generateSignedUrl({
          credentials,
          region: config.region,
          url: `${row.url}?versionId=${version.versionId}`,
        }))
        .then(setVersionUrl);
    })();
  }, [ctx, row.url, version.versionId]);

  return (
    <TableRow key={version.versionId}>
      <TableCell component="th" scope="row">
        <Link
          color="secondary"
          href={versionUrl}
          target="_blank"
        >
          <Typography variant="body2">
            {version.versionId}
          </Typography>
        </Link>
      </TableCell>
      <TableCell>{version.lastModified ? new Date(version.lastModified).toLocaleString() : 'Unknown'}</TableCell>
    </TableRow>
  );
};

export default Expandable;
