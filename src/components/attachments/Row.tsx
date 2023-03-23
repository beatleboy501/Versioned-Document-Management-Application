import React, { useContext, useEffect, useState } from "react";
import {
  makeStyles,
  Box,
  Collapse,
  Link,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@material-ui/core";
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
} from "@mui/icons-material";
import { AwsCredentialIdentity } from "@aws-sdk/types";
import generateSignedUrl from "../../generateSignedUrl";
import { RowProps } from "../../types/Props";
import config from "../../s3-config.json";
import { AuthContext } from "../Auth";
import Expandable from "./Expandable";

const useRowStyles = makeStyles({
  root: {
    "& > *": {
      borderBottom: "unset",
    },
  },
});

export default function Row({ row }: RowProps) {
  const ctx = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const classes = useRowStyles();
  const [baseUrl, setBaseUrl] = useState(row.url);

  useEffect(() => {
    (async () => {
      await ctx
        .defaultCredentialProvider()
        .then(async (credentials: AwsCredentialIdentity) =>
          generateSignedUrl({
            credentials,
            region: config.region,
            url: row.url,
          })
        )
        .then(setBaseUrl);
    })();
  }, [ctx, row.url]);

  return (
    <>
      <TableRow className={classes.root}>
        <TableCell component="th" scope="row">
          <Link color="secondary" href={baseUrl} target="_blank">
            <Typography variant="body2">{row.name}</Typography>
          </Link>
        </TableCell>
        <TableCell>{row.type}</TableCell>
        <TableCell align="right">
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box margin={1}>
              <Table size="small" aria-label="purchases">
                <TableHead>
                  <TableRow>
                    <TableCell>Version</TableCell>
                    <TableCell>Last Modified</TableCell>
                    <TableCell align="right">Last Modified By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(row.versions)
                    ? row.versions.map(v => <Expandable key={v.versionId} row={row} version={v} />)
                    : null}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
