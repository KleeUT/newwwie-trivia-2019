const stage = "v1";

import { region } from "./notificationLambda/constants";
export const configProvider = (): Config => ({
  tableName: process.env.DYNAMO_TABLE || "Bad config",
  apiGatewayUri: `https://${process.env.API_GATEWAY_ID}.execute-api.${region}.amazonaws.com/${stage}`
});
export type Config = {
  tableName: string;
  apiGatewayUri: string;
};
