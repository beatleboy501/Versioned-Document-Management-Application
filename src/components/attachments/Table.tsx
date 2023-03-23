import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@material-ui/core';
import { AttachmentsLinkProps } from '../../types/Props';
import { mapToRow } from './utils';

const AttachmentsTable = ({ attachments }: AttachmentsLinkProps) => (
  <TableContainer>
    <Table aria-label="collapsible table">
      <TableHead>
        <TableRow>
          <TableCell>Name</TableCell>
          <TableCell>Type</TableCell>
          <TableCell align="right">Versions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {mapToRow(attachments)}
      </TableBody>
    </Table>
  </TableContainer>
);

export default AttachmentsTable;
