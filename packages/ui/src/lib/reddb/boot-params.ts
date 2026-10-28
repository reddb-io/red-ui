// Compatibility entry point for the original red-ui Open Contract API.
export {
  OpenContractError,
  parseOpenContract,
  encodeOpenContract,
  parseBootParams,
  hasBootEndpoint,
  hasBootRoute,
} from "@reddb-io/design-system/adapters/reddb";
export type {
  OpenContract,
  OpenContractErrorCode,
  BootParams,
} from "@reddb-io/design-system/adapters/reddb";
