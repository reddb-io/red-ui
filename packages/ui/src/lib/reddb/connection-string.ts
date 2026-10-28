// Compatibility entry point for callers of the original red-ui source API.
// The implementation belongs to the opt-in RedDB adapter in the Design System.
export {
  ConnectionStringError,
  decodeConnectionString,
  parseConnectionString,
} from "@reddb-io/design-system/adapters/reddb";
export type {
  ConnectionCredentials,
  ParsedConnectionString,
} from "@reddb-io/design-system/adapters/reddb";
