export const configProvider = (): Config => ({
  tableName: process.env.DYNAMO_TABLE || "Bad config"
});
export type Config = {
  tableName: string;
};
